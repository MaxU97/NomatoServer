const db = require("../models");
const fs = require("fs");
const path = require("path");
const Review = db.review;
const mongoose = require("mongoose");

exports.createReview = (req, res) => {
  const review = new Review({
    userID: mongoose.Types.ObjectId(req.userId),
    itemID: mongoose.Types.ObjectId(req.body.itemID),
    language: "EN",
    text: req.body.text,
    datePosted: Date.now(),
    type: req.body.type,
  });

  review.save();
  res.status(200).send({ message: "Review created" });
};

exports.getReviews = (req, res) => {
  if (!req.query.itemID) {
    res.status(404).send({ message: "Not Found" });
    return;
  }

  Review.find(
    {
      itemID: mongoose.Types.ObjectId(req.query.itemID),
      // language: req.headers["accept-language"].toUpperCase(),
    },
    { _id: 1, text: 1, type: 1, userID: 1, datePosted: 1 }
  )
    .populate("userID", { name: 1, profileImage: 1, _id: 0 })
    .sort({ _id: -1 })
    .exec((err, review) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      res.status(200).send({ reviews: review });
    });
};
