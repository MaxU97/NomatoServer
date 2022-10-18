const db = require("../models");
const fs = require("fs");
const path = require("path");
const Review = db.review;
const Item = db.item;
const mongoose = require("mongoose");
const i18n = require("../../locales/i18n");
exports.getReviews = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  if (!req.query.itemID) {
    res.status(404).send({ message: t("review.not-found") });
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
        res.status(500).send({ message: t("error") });
        return;
      }
      res.status(200).send({ reviews: review });
    });
};
