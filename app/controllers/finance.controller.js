const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const stripe = require("stripe")(process.env.STRIPE_KEY);

exports.withdraw = (req, res) => {
  User.findOne(
    { _id: mongoose.Types.ObjectId(req.userId) },
    { sellerID: 1 }
  ).exec(async (err, user) => {
    if (err) {
      res.status(500).send("Something Went Wrong");
      return;
    }
    if (!user) {
      res.status(404).send("User Not Found");
    }

    const balance = await stripe.balance.retrieve({
      stripeAccount: user.sellerID,
    });
    if (balance.available[0].amount < req.body.amount) {
      res.status(403).send({ message: "You do not have enough settled funds" });
      return;
    } else {
      const payout = await stripe.payouts.create(
        {
          amount: amount * 100,
          currency: "usd",
        },
        {
          stripeAccount: user.sellerID,
        }
      );
      res.status(200).send({ message: "Funds withdrawn" });
    }
  });
};
