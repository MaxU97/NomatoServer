const db = require("../models");
const mongoose = require("mongoose");
const Booking = db.booking;
const User = db.user;
const Item = db.item;
const Finance = db.finance;
const crypto = require("crypto");

const stripe = require("stripe")(process.env.STRIPE_KEY);
var differenceInCalendarDays = require("date-fns/differenceInCalendarDays");
var differenceInHours = require("date-fns/differenceInHours");
const { response } = require("express");
const { booking } = require("../models");
const sendApprovalNotification = require("../services/scheduler/jobs/sendApprovalNotification");
const sendRefusalNotification = require("../services/scheduler/jobs/sendRefusalNotification");
const sendRequestNotification = require("../services/scheduler/jobs/sendRequestNotification");
const i18n = require("../../locales/i18n");
const {
  getDaysBetween,
  getDatesWithinRange,
} = require("../utility/datesUtilities");
const { secret_key, iv } = require("../config/auth.config");
const _ = require("lodash");
const sendStripeRegisterEmail = require("../services/scheduler/jobs/sendStripeRegisterEmail");
const sendReviewRequest = require("../services/scheduler/jobs/sendReviewRequest");
exports.getServiceFee = (req, res) => {
  res.send({ serviceFee: process.env.SERVICE_FEE });
};

const { set, isAfter, isBefore, parseISO, isSameDay } = require("date-fns");

exports.request = async (req, res) => {
  let price;
  var daySubmitted = set(parseISO(req.body.dateStart), {
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  var dayNow = set(new Date(Date.now()), {
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });
  var date12Today = set(new Date(Date.now()), {
    hours: 12,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });

  if (isAfter(Date.now(), date12Today)) {
    if (isSameDay(daySubmitted, Date.now())) {
      res.status(500).send({
        message: "You cannot make a booking on the same day after 12",
      });
      return;
    }
  } else {
    if (isBefore(daySubmitted, dayNow)) {
      res.status(500).send({
        message: "You cannot make a booking before today",
      });
      return;
    }
  }

  Item.findOne({ _id: mongoose.Types.ObjectId(req.body.itemID) })
    .populate("user")
    .exec((err, item) => {
      Booking.find(
        {
          itemID: mongoose.Types.ObjectId(req.body.itemID),
          status: { $in: ["approved", "with_customer", "returned"] },
        },
        { dateStart: 1, dateEnd: 1 }
      ).exec((err, bookings) => {
        var bookedDates = [];
        if (bookings.length > 0) {
          bookings.forEach((booking) => {
            const dates = getDaysBetween(booking.dateStart, booking.dateEnd);
            bookedDates.push(...dates);
          });
        }

        var submittedDays = getDaysBetween(
          req.body.dateStart,
          req.body.dateEnd
        );

        const allowBooking = submittedDays.every((element) => {
          if (bookedDates.includes(element)) {
            return false;
          } else {
            return true;
          }
        });
        if (allowBooking) {
          price = getPrice(
            req.body.dateEnd,
            req.body.dateStart,
            req.body.qtyWant,
            item
          );
          var fee = price * process.env.SERVICE_FEE;
          price = price + fee;

          User.findOne({ _id: mongoose.Types.ObjectId(req.userId) }).exec(
            async (err, user) => {
              let paymentIntent;
              if (!user.completionStatus) {
                res.status(400).send("You need to finish your profile");
                return;
              }
              paymentIntent = await stripe.paymentIntents.create({
                amount: price,
                currency: "eur",
                automatic_payment_methods: {
                  enabled: true,
                },
                capture_method: "manual",
              });

              res
                .status(200)
                .send({ clientSecret: paymentIntent.client_secret });
            }
          );
        } else {
          res.status(401).send({
            message:
              "You are not allowed to book dates that are already booked",
          });
        }
      });
    });
};

exports.recordBooking = (req, res) => {
  console.log(req);
  Booking.findOne({
    piid: req.body.client_secret,
    userID: mongoose.Types.ObjectId(req.userId),
  }).exec((err, bk) => {
    if (bk) {
      res.status(200).send("Booking already exists");
    } else {
      Item.findOne(
        {
          _id: mongoose.Types.ObjectId(req.body.itemData.itemID),
        },
        {
          user: 1,
        }
      ).exec((err, item) => {
        const booking = new Booking({
          userID: req.userId,
          ownerID: item.user,
          itemID: req.body.itemData.itemID,
          comment: req.body.itemData.comment,
          dateStart: req.body.itemData.dateStart,
          dateEnd: req.body.itemData.dateEnd,
          qtyWant: req.body.itemData.qtyWant,
          status: req.body.status,
          piid: req.body.client_secret,
        });
        booking.save();
        res.status(200).send("Booking sent");
      });
    }
  });
};

exports.sendBookingToOwner = (req, res) => {
  console.log(req.body);

  Booking.findOne({
    piid: req.body.payment_intent,
    userID: mongoose.Types.ObjectId(req.userId),
  })
    .populate("ownerID")
    .populate("itemID")
    .exec(async (err, booking) => {
      if (err) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      if (!booking) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      if (booking.status === "unfinished") {
        booking.status = "approval_required";
        booking.intentID = req.body.intentID;
        booking.created = Date.now();
      } else {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }

      await stripe.paymentIntents.update(req.body.intentID, {
        transfer_group: booking.id,
      });
      await sendRequestNotification(booking);
      booking.save();
      res.status(200).send({ message: "Request sent to owner" });
    });
};

exports.getBookingHistory = (req, res) => {
  Booking.find(
    {
      userID: mongoose.Types.ObjectId(req.userId),
      status: { $ne: "unfinished" },
    },
    { userID: 0, piid: 0, saveCard: 0, ownerID: 0 }
  )
    .populate({
      path: "itemID",
      select: {
        address: 0,
        addressNatural: 0,
        category: 0,
        subcat: 0,
        minRent: 0,
        likes: 0,
        dislikes: 0,
        user: 0,
        reviews: 0,
        itemQty: 0,
        itemValue: 0,
        descEN: 0,
        descLV: 0,
        descRU: 0,
      },
    })
    .exec((err, bookings) => {
      if (err) {
        res.status(404).send({ error: "Something Went Wrong" });
      }
      res.send({ bookingHistory: bookings });
    });
};

exports.getRequests = (req, res) => {
  Booking.find(
    {
      ownerID: mongoose.Types.ObjectId(req.userId),
      status: { $ne: "unfinished" },
    },
    { piid: 0, saveCard: 0, ownerID: 0 }
  )
    .populate({
      path: "itemID",
      select: {
        address: 0,
        category: 0,
        subcat: 0,
        minRent: 0,
        likes: 0,
        dislikes: 0,
        user: 0,
        reviews: 0,
        itemQty: 0,
        itemValue: 0,
        descEN: 0,
        descLV: 0,
        descRU: 0,
      },
    })
    .populate({
      path: "userID",
      select: { _id: 1, name: 1, surname: 1, profileImage: 1 },
    })
    .exec((err, bookings) => {
      if (err) {
        res.status(404).send({ error: "Something Went Wrong" });
      }
      res.send({ bookingRequests: bookings });
    });
};

exports.cancelBooking = (req, res) => {
  Booking.findOne({
    userID: mongoose.Types.ObjectId(req.userId),
    _id: mongoose.Types.ObjectId(req.body.booking_id),
    status: { $nin: ["with_customer", "canceled", "refused", "returned"] },
  })
    .populate("itemID")
    .populate("ownerID")
    .exec((err, booking) => {
      if (err) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      if (!booking) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }

      if (booking.status === "approved") {
        cancelApprovedBooking(req, res, booking);
      } else {
        cancelOtherBooking(req, res, booking);
      }
    });
};

const cancelApprovedBooking = async (req, res, booking) => {
  const now = new Date(Date.now());
  const dayCount = differenceInCalendarDays(
    new Date(booking.dateEnd),
    new Date(booking.dateStart)
  );

  const price = getPrice(
    booking.dateEnd,
    booking.dateStart,
    booking.qtyWant,
    booking.itemID
  );

  const hoursUntilBooking = differenceInHours(
    new Date(booking.dateStart),
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      0,
      0
    )
  );

  User.findOne({ _id: booking.ownerID._id }).exec(async (err, user) => {
    try {
      if (24 < hoursUntilBooking && hoursUntilBooking < 48) {
        await stripe.transfers.create({
          amount: price / 2,
          currency: "eur",
          source_transaction: booking.chargeID,
          destination: user.customerID,
        });

        await stripe.refunds.create({
          payment_intent: booking.intentID,
          amount: price / 2,
        });

        const finance = new Finance({
          user: booking.ownerID._id,
          type: "in",
          amount: price / 2,
          paymentID: booking.intentID,
          description: "Partial payment for cancelling late",
          status: "unsettled",
          dateAdded: Date.now(),
        });
        booking.status = "canceled";
        finance.save();
        booking.save();
        res.status(200).send({ message: "Booking Cancelled, half refunded" });
        return;
      } else if (hoursUntilBooking < 24) {
        await stripe.transfers.create({
          amount: price,
          currency: "eur",
          destination: user.customerID,
          source_transaction: booking.chargeID,
        });
        const finance = new Finance({
          user: booking.ownerID._id,
          type: "in",
          amount: price,
          paymentID: booking.paymentId,
          description: "Payment for cancelling late",
          status: "unsettled",
          dateAdded: Date.now(),
        });
        finance.save();
        booking.status = "canceled";
        booking.save();
        res
          .status(200)
          .send({ message: "Booking Cancelled, nothing refunded" });
      } else {
        await stripe.refunds.create({
          payment_intent: booking.intentID,
          amount: price,
          reason: "requested_by_customer",
        });
        booking.status = "canceled";
        booking.save();
        res.status(200).send({ message: "Booking Cancelled, Refunded All" });
      }
    } catch (err) {
      res.status(500).send({ message: "Something went wrong" });
    }
  });
};

const cancelOtherBooking = async (req, res, booking) => {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(booking.intentID);
    booking.status = "canceled";
    booking.save();
    res.status(200).send({ message: "Booking Canceled" });
  } catch (err) {
    if (err.payment_intent) {
      if (err.payment_intent.status == "canceled") {
        booking.status = "canceled";
        booking.save();
        res.status(200).send({ message: "Booking Canceled" });
        return;
      }
    }
    res.status(500).send({ message: "Something went wrong" });
  }
};

exports.refuseBooking = (req, res) => {
  Booking.findOne({
    ownerID: mongoose.Types.ObjectId(req.userId),
    _id: mongoose.Types.ObjectId(req.body.booking_id),
    status: { $nin: ["with_customer", "canceled", "refused", "returned"] },
  })
    .populate("userID")
    .populate("itemID")
    .exec(async (err, booking) => {
      if (err) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      if (!booking) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }

      await stripe.paymentIntents.cancel(booking.intentID);
      booking.status = "refused";
      booking.refuseReason = req.body.reason;
      booking.save();
      await sendRefusalNotification(booking);
      res.status(200).send({ message: "Booking Refused" });
    });
};

exports.approveBooking = (req, res) => {
  Booking.findOne({
    ownerID: mongoose.Types.ObjectId(req.userId),
    _id: mongoose.Types.ObjectId(req.body.booking_id),
    status: { $nin: ["with_customer", "canceled", "refused", "returned"] },
  })
    .populate("userID")
    .populate("ownerID")
    .populate("itemID")
    .exec(async (err, booking) => {
      if (err) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      if (!booking) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      try {
        const paymentIntent = await stripe.paymentIntents.capture(
          booking.intentID
        );
        booking.chargeID = paymentIntent.charges.data[0].id;
        booking.status = "approved";
        booking.save();
      } catch (err) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      await sendApprovalNotification(booking);
      res.status(200).send({ message: "Booking Approved" });
    });
};

exports.getApprovedUser = (req, res) => {
  Booking.findOne({
    ownerID: mongoose.Types.ObjectId(req.userId),
    userID: mongoose.Types.ObjectId(req.body.userID),
    _id: mongoose.Types.ObjectId(req.body.booking_id),
    status: { $in: ["approved"] },
  })
    .populate({ path: "userID", select: { number: 1, email: 1, _id: 0 } })
    .exec((err, booking) => {
      if (err) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }
      if (!booking) {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }

      res.status(200).send({ userDetails: booking.userID });
    });
};

exports.qrHash = (req, res) => {
  var filter = {};
  if (req.body.type) {
    switch (req.body.type) {
      case "pickup":
        filter = {
          userID: mongoose.Types.ObjectId(req.userId),
          _id: mongoose.Types.ObjectId(req.body.booking),
          status: { $in: ["approved"] },
        };
        break;
      case "dropoff":
        filter = {
          ownerID: mongoose.Types.ObjectId(req.userId),
          _id: mongoose.Types.ObjectId(req.body.booking),
          status: { $in: ["with_customer"] },
        };
        break;
    }
  } else {
    res.status(403).send({ message: "Wrong type submitted" });
    return;
  }

  Booking.findOne(filter).exec((err, booking) => {
    if (!booking) {
      res
        .status(404)
        .send({ status: false, message: t("qr.booking-not-found") });
      return;
    }
    if (err) {
      res.status(500).send({ status: false, message: t("error") });
      return;
    }

    var stringToHash;
    if (req.body.type === "pickup") {
      stringToHash = {
        type: req.body.type,
        booking: booking.id,
        userID: booking.userID,
      };
    } else if (req.body.type === "dropoff") {
      stringToHash = {
        type: req.body.type,
        booking: booking.id,
        userID: booking.ownerID,
      };
    }

    const newHash = encrypt(JSON.stringify(stringToHash));
    res.status(200).send(newHash);
    return;
  });
};

const encrypt = (text) => {
  let cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(secret_key, "base64").slice(0, 32),
    Buffer.from(iv, "base64").slice(0, 16)
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return { encryptedData: encrypted.toString("hex") };
};

// Decrypting text
const decrypt = (text) => {
  let encryptedText = Buffer.from(text, "hex");
  let decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(secret_key, "base64").slice(0, 32),
    Buffer.from(iv, "base64").slice(0, 16)
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

exports.scanQR = (req, res) => {
  const t = i18n(req.headers["accept-language"]);
  const options = JSON.parse(decrypt(req.body.encryptedData));
  let ownerID;
  let userID;
  let statusArray;
  let newStatus;
  let message;
  if (options.type) {
    switch (options.type) {
      case "pickup":
        statusArray = ["approved"];
        newStatus = "with_customer";
        message = t("qr.pick-up");
        ownerID = mongoose.Types.ObjectId(req.userId);
        userID = mongoose.Types.ObjectId(options.userID);
        break;
      case "dropoff":
        ownerID = mongoose.Types.ObjectId(options.userID);
        userID = mongoose.Types.ObjectId(req.userId);
        statusArray = ["with_customer"];
        newStatus = "returned";
        message = t("qr.drop-off");
        break;
    }
  } else {
    res.status(403).send({ message: "Wrong type submitted" });
    return;
  }

  Booking.findOne({
    ownerID: ownerID,
    userID: userID,
    _id: mongoose.Types.ObjectId(options.booking),
    status: { $in: statusArray },
  })
    .populate("ownerID")
    .populate("itemID")
    .exec(async (err, booking) => {
      if (!booking) {
        res
          .status(404)
          .send({ status: false, message: t("qr.booking-not-found") });
        return;
      }
      if (err) {
        res.status(500).send({ status: false, message: t("error") });
        return;
      }
      if (newStatus == "with_customer") {
        const price = getPrice(
          booking.dateEnd,
          booking.dateStart,
          booking.qtyWant,
          booking.itemID
        );

        const transfer = await stripe.transfers.create({
          amount: price,
          currency: "eur",
          destination: booking.ownerID.customerID,
          source_transaction: booking.chargeID,
        });

        const finance = new Finance({
          user: booking.ownerID._id,
          type: "in",
          amount: price,
          paymentID: booking.paymentId,
          description: "Payment for picking up item",
          status: "unsettled",
          dateAdded: Date.now(),
        });
        finance.save();
        //TODO THINK ABOUT WHAT TO PUT ON PAYMENTID
      } else {
        sendReviewRequest(booking);
        booking.reviewed = false;
      }
      booking.status = newStatus;
      booking.save();
      res.send({ status: true, message: message });
    });
};

exports.getAvailableQty = (req, res) => {
  const { from, to } = req.body.dates;
  Item.findOne(
    { _id: mongoose.Types.ObjectId(req.body.itemID) },
    {
      itemQty: 1,
    }
  ).exec((err, item) => {
    if (err) {
      res.status(500).send({ status: false, message: t("error") });
      return;
    }
    if (!item) {
      res.status(404).send({ message: "Item Not Found" });
      return;
    }
    Booking.find(
      {
        status: { $in: ["approved", "with_customer"] },

        $nor: [
          { dateEnd: { $lte: new Date(from) } },
          { dateStart: { $gte: new Date(to) } },
        ],

        itemID: req.body.itemID,
      },
      { qtyWant: 1, dateStart: 1, dateEnd: 1 }
    ).exec((err, bookings) => {
      if (err) {
        res.status(500).send({ status: false, message: t("error") });
        return;
      }
      if (_.isEmpty(bookings)) {
        res.status(200).send({ qtyAvailable: item.itemQty });
        return;
      }

      var qtyAndBookedDates = [];
      bookings.forEach((booking) => {
        var dates = getDaysBetween(booking.dateStart, booking.dateEnd);
        dates = getDatesWithinRange(dates, from, to);
        const dateObject = dates.reduce(
          (a, v) => ({ ...a, [v]: booking.qtyWant }),
          {}
        );
        delete dateObject["undefined"];
        qtyAndBookedDates.push(dateObject);
      });

      var obj = {};
      qtyAndBookedDates.forEach((obj2) => {
        obj = Object.entries(obj2).reduce(
          (acc, [key, value]) => ({ ...acc, [key]: (acc[key] || 0) + value }),
          { ...obj }
        );
      });

      var max = Math.max(...Object.values(obj));
      res.status(200).send({ qtyAvailable: item.itemQty - max });
    });
  });
};

const getPrice = (dateEnd, dateStart, qtyWant, item) => {
  const dayCount = differenceInCalendarDays(
    new Date(dateEnd),
    new Date(dateStart)
  );
  if (dayCount < 7) {
    price = qtyWant * dayCount * item.rentPriceDay * 100;
  } else if (7 <= dayCount && dayCount < 30) {
    price = qtyWant * dayCount * item.rentPriceWeek * 100;
  } else if (dayCount >= 30) {
    price = qtyWant * dayCount * item.rentPriceMonth * 100;
  }
  return price;
};

exports.checkExpiredBookings = (req, res) => {
  res.status(200).send();
  console.log();
  Booking.find({
    // created: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    status: { $in: ["approval_required"] },
  }).exec((err, bookings) => {
    if (!bookings) {
      console.log("No bookings made more than 24hrs");
      return;
    }

    bookings.map(async (booking) => {
      try {
        await stripe.paymentIntents.cancel(booking.intentID);
        booking.status = ["refused"];
        booking.refuseReason = "Automatic Refusal";
        booking.save();
      } catch (err) {
        console.log(err);
      }
    });
  });
};

exports.checkApprovedBookings = (req, res) => {
  res.status(200).send();
  console.log();
  Booking.find({
    dateStart: { $lt: new Date(Date.now()) },
    status: { $in: ["approved"] },
  })
    .populate("ownerID")
    .populate("itemID")
    .exec((err, bookings) => {
      if (!bookings) {
        console.log("No bookings expired");
        return;
      }

      bookings.map(async (booking) => {
        try {
          const price = getPrice(
            booking.dateEnd,
            booking.dateStart,
            booking.qtyWant,
            booking.itemID
          );
          await stripe.transfers.create({
            amount: price,
            currency: "eur",
            destination: booking.ownerID.customerID,
            source_transaction: booking.chargeID,
          });
          booking.status = "canceled";
          booking.refuseReason = "Automatic Cancel";
          booking.save();
        } catch (err) {
          console.log(err);
        }
      });
    });
};
