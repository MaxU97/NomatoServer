const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const PreReg = db.preregdetails;
const stripe = require("stripe")(process.env.STRIPE_KEY);
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const i18n = require("../../locales/i18n");
const sendEmailConfirmation = require("../services/scheduler/jobs/sendEmailConfirmation");

exports.signup = async (req, res) => {
  PreReg.findOne({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec(async (err, prereg) => {
    const customer = await stripe.customers.create({
      email: prereg.email,
      phone: prereg.phone,
    });
    const user = new User({
      email: prereg.email,
      phone: prereg.phone,
      password: prereg.password,
      lastActive: Date.now(),
      stripeID: customer.id,
      languages: prereg.languages,
    });
    user.save((err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      var token = jwt.sign({ id: user.id }, config.secret, {
        expiresIn: 86400, // 24 hours
      });
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        res.status(200).send({
          accessToken: token,
        });
      }
    });
  });
};

exports.signin = (req, res) => {
  const t = i18n(req.headers["accept-language"]);
  User.findOne({
    email: req.body.email,
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (!user) {
      return res.status(401).send({ message: t("login.invalid") });
    }
    var passwordIsValid = bcrypt.compareSync(req.body.password, user.password);
    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: t("login.invalid"),
      });
    }
    var token = jwt.sign({ id: user.id }, config.secret, {
      expiresIn: 86400, // 24 hours
    });

    renewUser(user, res);

    res.status(200).send({
      accessToken: token,
    });
  });
};

exports.preRegEmail = (req, res) => {
  const number = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  if (res.locals.emailExists) {
    //existing email in prereg database
    PreReg.findOne({
      email: req.body.email,
    }).exec((err, prereg) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      prereg.password = bcrypt.hashSync(req.body.password, 8);
      prereg.emailConfirmNumber = number;
      prereg.save((err, prereg) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res.send({ email: prereg.email });
          sendEmailConfirmation(req.body.email, number);
        }
      });
    });
  } else {
    const preReg = new PreReg({
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
    });

    preReg.emailConfirmNumber = number;
    preReg.save((err, prereg) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      } else {
        res.send({ email: prereg.email });
        sendEmailConfirmation(req.body.email, number);
      }
    });
  }
};

exports.preRegPhone = (req, res) => {
  const number = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  PreReg.findOne({
    email: req.body.email,
  }).exec((err, prereg) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (prereg) {
      prereg.phone = req.body.phone;
      prereg.phoneConfirmNumber = number;
      prereg.languages = req.body.languages;
      prereg.save((err, prereg) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          res.send({ phone: prereg.phone });
          sendPhoneConfirmation(req.body.phone, number);
        }
      });
    } else {
      res
        .status(404)
        .send({ message: "Email and Phone combination not found" });
    }
  });
};

const sendPhoneConfirmation = (phone, number) => {
  ///TODO
};

exports.confirmEmail = (req, res) => {
  const t = i18n(req.headers["accept-language"]);
  PreReg.findOne({ email: req.body.email }).exec((err, prereg) => {
    if (err) {
      res.status(500).send({ message: "Something went wrong" });
      return;
    }
    if (prereg.emailConfirmNumber === req.body.code) {
      prereg.confirmedEmail = true;
      prereg.save();
      res.status(200).send({ message: "Email Confirmed" });
    } else {
      res.status(401).send({ message: t("prereg.invalid-email") });
    }
  });
};

exports.resendEmailCode = (req, res) => {
  const number = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  if (res.locals.emailExists) {
    PreReg.findOne({ email: req.body.email }).exec((err, prereg) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      prereg.emailConfirmNumber = number;
      prereg.resentEmailDate = Date.now();
      prereg.save();
      sendEmailConfirmation(req.body.email, number);
      res.status(200).send({ message: "Resent!" });
    });
  } else {
    res.status(404).send({ message: "Email not found" });
  }
};

exports.confirmPhone = (req, res) => {
  const t = i18n(req.headers["accept-language"]);
  PreReg.findOne({ email: req.body.email, phone: req.body.phone }).exec(
    (err, prereg) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      if (prereg.phoneConfirmNumber === req.body.code) {
        prereg.confirmedPhone = true;
        prereg.save();
        res.status(200).send({ _id: prereg._id });
      } else {
        res.status(401).send({ message: t("prereg.invalid-email") });
      }
    }
  );
};

exports.resendPhoneCode = (req, res) => {
  const number = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
  if (res.locals.emailExists) {
    PreReg.findOne({ email: req.body.email, phone: req.body.phone }).exec(
      (err, prereg) => {
        if (err) {
          res.status(500).send({ message: "Something went wrong" });
          return;
        }
        if (prereg) {
          prereg.phoneConfirmNumber = number;
          prereg.resentPhoneDate = Date.now();
          prereg.save();
          sendPhoneConfirmation(req.body.email, number);
          res.status(200).send({ message: "Resent!" });
        }
      }
    );
  } else {
    res.status(404).send({ message: "Email not found" });
  }
};

exports.getSelf = (req, res) => {
  console.log(req.userId);

  User.findOne({
    _id: mongoose.Types.ObjectId(req.userId),
  }).exec((err, user) => {
    console.log(err);
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    }

    renewUser(user, res);

    res.status(200).send({
      id: user._id,
      username: user.username,
      name: user.name,
      surname: user.surname,
      email: user.email,
      admin: user.admin,
      profileImage: user.profileImage,
      lastActive: user.lastActive,
      preferedLanguage: user.languages[0],
    });
  });
};

const renewUser = (user, res) => {
  user.lastActive = Date.now();
  user.save((err) => {
    if (err) {
      res.status(500).send({ message: err });
    }
  });
};
