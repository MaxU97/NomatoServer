const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const i18n = require("../../locales/i18n");

exports.updateProfile = (req, res) => {
  User.findOne({
    _id: mongoose.Types.ObjectId(req.userId),
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (!user) {
      return res.status(404).send({ message: "User Not found." });
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
          message: "Image Reset",
          image: user.profileImage,
        });
      }
    });
  });
};
