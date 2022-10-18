const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const i18n = require("../../locales/i18n");

exports.updateProfile = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findOne({
    _id: mongoose.Types.ObjectId(req.userId),
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (!user) {
      return res.status(404).send({ message: t("auth.user-not-found") });
    }
    user.profileImage = req.file.filename;
    user.save((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        res.status(200).send({
          message: { message: t("auth.image-reset") },
          image: user.profileImage,
        });
      }
    });
  });
};
