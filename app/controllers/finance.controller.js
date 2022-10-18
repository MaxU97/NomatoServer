const db = require("../models");
const mongoose = require("mongoose");
const Booking = db.booking;
const Item = db.item;
const User = db.user;
const Finance = db.finance;
const i18n = require("../../locales/i18n");
var differenceInCalendarDays = require("date-fns/differenceInCalendarDays");
var differenceInHours = require("date-fns/differenceInHours");
const {
  getDaysBetween,
  getDatesWithinRange,
} = require("../utility/datesUtilities");
const stripe = require("stripe")(process.env.STRIPE_KEY);

exports.withdraw = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findOne({ _id: mongoose.Types.ObjectId(req.userId) }).exec(
    async (err, user) => {
      if (err) {
        res.status(500).send(t("error"));
        return;
      }
      if (!user) {
        res.status(404).send("User Not Found");
      }
      if (user.customerID) {
        try {
          const account = await stripe.balance.retrieve({
            stripeAccount: user.customerID,
          });

          if (account.available[0].amount < req.body.amount * 100) {
            res.status(403).send({ message: t("finance.no-funds") });
            return;
          } else {
            try {
              const payout = await stripe.payouts.create(
                {
                  amount: req.body.amount * 100,
                  currency: "eur",
                  metadata: { user_email: user.email, amount: req.body.amount },
                },
                {
                  stripeAccount: user.customerID,
                }
              );
              const finance = new Finance({
                user: user._id,
                type: "out",
                amount: -req.body.amount,
                paymentID: "TODO",
                description: "Withdrawal",
                status: "unsettled",
                dateAdded: Date.now(),
              });
              finance.save();
              res.status(200).send({ message: t("finance.withdrawn") });
            } catch (err) {
              res.status(500).send({ message: err.message });
            }
          }
        } catch (err) {
          res.status(500).send({ message: t("error") });
          return;
        }
      } else {
        res.status(500).send({
          message: t("finance.no-bank"),
        });
      }
    }
  );
};

const getPrice = (dateEnd, dateStart, qtyWant, item) => {
  var price;
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
