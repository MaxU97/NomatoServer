const db = require("../models");
const mongoose = require("mongoose");
const Booking = db.booking;
const User = db.user;
const Item = db.item;

const stripe = require("stripe")(process.env.STRIPE_KEY);
var differenceInCalendarDays = require("date-fns/differenceInCalendarDays");
var differenceInHours = require("date-fns/differenceInHours");
const { response } = require("express");
const { booking } = require("../models");
const sendApprovalNotification = require("../services/scheduler/jobs/sendApprovalNotification");
const sendRefusalNotification = require("../services/scheduler/jobs/sendRefusalNotification");
const sendRequestNotification = require("../services/scheduler/jobs/sendRequestNotification");
const i18n = require("../../locales/i18n");
exports.getServiceFee = (req, res) => {
  res.send({ serviceFee: process.env.SERVICE_FEE });
};

exports.request = async (req, res) => {
  let price;
  Item.findOne({ _id: mongoose.Types.ObjectId(req.body.itemID) }).exec(
    (err, item) => {
      price = getPrice(
        req.body.dateEnd,
        req.body.dateStart,
        req.body.qtyWant,
        item
      );
      price = price + price * process.env.SERVICE_FEE + 25;

      User.findOne({ _id: mongoose.Types.ObjectId(req.userId) }).exec(
        async (err, user) => {
          let paymentIntent;
          if (!user.completionStatus) {
            res.status(400).send("You need to finish your profile");
            return;
          }
          if (req.body.paymentID != "new") {
            paymentIntent = await stripe.paymentIntents.create({
              amount: price,
              currency: "eur",
              customer: user.stripeID,
              payment_method: req.body.paymentID,
              capture_method: "manual",
            });
          } else {
            paymentIntent = await stripe.paymentIntents.create({
              customer: user.stripeID,
              amount: price,
              currency: "eur",
              setup_future_usage: "on_session",
              automatic_payment_methods: {
                enabled: true,
              },
              capture_method: "manual",
            });
          }

          res.status(200).send({ clientSecret: paymentIntent.client_secret });
        }
      );
    }
  );
};

exports.getPaymentMethods = (req, res) => {
  User.findOne({ _id: mongoose.Types.ObjectId(req.userId) }).exec(
    async (err, user) => {
      const { data: paymentMethods } = await stripe.paymentMethods.list({
        customer: user.stripeID,
        type: "card",
      });

      const methodsFiltered = [];

      paymentMethods.forEach((method) => {
        methodsFiltered.push({
          id: method.id,
          last: method.card.last4,
          type: method.card.brand,
        });
      });

      res.status(200).send({ methods: methodsFiltered });
    }
  );
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
          saveCard: req.body.saveCard,
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
    piid: req.body.clientSecret,
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
      } else {
        res.status(404).send({ error: "Something Went Wrong" });
        return;
      }

      await sendRequestNotification(booking);

      if (booking.saveCard === "false") {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          req.body.intentID
        );

        await stripe.paymentMethods.detach(paymentIntent.payment_method);
        booking.saveCard === "deleted";
      }
      booking.intentID = req.body.intentID;
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

  if (24 < hoursUntilBooking && hoursUntilBooking < 48) {
    await stripe.refunds.create({
      payment_intent: booking.intentID,
      amount: price / 2,
    });
    booking.status = "canceled";
    booking.save();
    res.status(200).send({ message: "Booking Cancelled, half refunded" });
  } else if (hoursUntilBooking < 24) {
    booking.status = "canceled";
    booking.save();
    res.status(200).send({ message: "Booking Cancelled, nothing refunded" });
  } else {
    await stripe.refunds.create({
      payment_intent: booking.intentID,
      amount: price,
    });
    booking.status = "canceled";
    booking.save();
    res.status(200).send({ message: "Booking Cancelled, Refunded All" });
  }
};

const cancelOtherBooking = async (req, res, booking) => {
  const price = getPrice(
    booking.dateEnd,
    booking.dateStart,
    booking.qtyWant,
    booking.itemID
  );
  await stripe.refunds.create({
    payment_intent: booking.intentID,
    amount: price,
  });
  booking.status = "canceled";
  booking.save();
  res.status(200).send({ message: "Booking Canceled" });
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
      booking.status = "approved";
      booking.save();
      try {
        const paymentIntent = await stripe.paymentIntents.capture(
          booking.intentID
        );
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

exports.scanQR = (req, res) => {
  const t = i18n(req.headers["accept-language"]);

  const options = req.body;
  let ownerID;
  let userID;
  let statusArray;
  let newStatus;
  let message;
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

  Booking.findOne({
    ownerID: ownerID,
    userID: userID,
    _id: mongoose.Types.ObjectId(options.booking),
    status: { $in: statusArray },
  }).exec((err, booking) => {
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
    booking.status = newStatus;
    booking.save();
    res.send({ status: true, message: message });
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
