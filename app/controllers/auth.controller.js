const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const PreReg = db.preregdetails;
const stripe = require("stripe")(process.env.STRIPE_KEY);
const differenceInCalendarDays = require("date-fns/differenceInCalendarDays");
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const i18n = require("../../locales/i18n");
const sendEmailConfirmation = require("../services/scheduler/jobs/sendEmailConfirmation");
const {
  parseAddress,
  parseAddressFull,
} = require("../utility/addressUtilities");
const sendForgotPasswordEmail = require("../services/scheduler/jobs/sendForgotPasswordEmail");

const _ = require("lodash");

exports.signup = async (req, res) => {
  PreReg.findOneAndDelete({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec(async (err, prereg) => {
    const account = await stripe.accounts.create({
      type: "express",
      email: prereg.email,
      settings: {
        payouts: {
          schedule: {
            interval: "manual",
          },
        },
      },
    });
    const customer = await stripe.customers.create({
      email: prereg.email,
      phone: prereg.phone,
    });
    const user = new User({
      email: prereg.email,
      phone: prereg.phone,
      phoneLastChanged: Date.now(),
      password: prereg.password,
      lastActive: Date.now(),
      stripeID: customer.id,
      sellerID: account.id,
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
  }).exec(async (err, prereg) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (prereg) {
      prereg.phone = req.body.phone;
      prereg.phoneConfirmNumber = number;
      prereg.languages = req.body.languages;
      prereg.save(async (err, prereg) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        } else {
          try {
            await sendPhoneConfirmation(req, number);
            res.send({ phone: prereg.phone });
          } catch (err) {
            res
              .status(500)
              .sendMessage("Something went wrong, please try again");
          }
        }
      });
    } else {
      res
        .status(404)
        .send({ message: "Email and Phone combination not found" });
    }
  });
};

const sendPhoneConfirmation = async (req, code) => {
  // http://api1.esteria.lv/send?api-key=%api-key%&sender=%sender%&number=%number%&text=%text%
  var axios = require("axios");
  const t = i18n(req.headers["accept-language"]);
  const text = t("phone-message") + " " + code;
  const sender = "NomaTo";
  const api = process.env.SMS_API;
  const number = req.body.phone;
  const url = `https://api1.esteria.lv/send?api-key=${api}&sender=${sender}&number=${number}&text=${text}`;
  axios
    .get(url)
    .then((res) => {
      console.log(res);
      if (res.data < 100) {
        throw "Something went wrong";
      }
    })
    .catch((error) => {
      throw error;
    });
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
      async (err, prereg) => {
        if (err) {
          res.status(500).send({ message: "Something went wrong" });
          return;
        }
        if (prereg) {
          prereg.phoneConfirmNumber = number;
          prereg.resentPhoneDate = Date.now();
          prereg.save();
          await sendPhoneConfirmation(req, number);
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

    const phoneDiff = differenceInCalendarDays(
      Date.now(),
      user.phoneLastChanged
    );
    var addressDiff = differenceInCalendarDays(
      Date.now(),
      user.addressLastChanged
    );
    if (!addressDiff) {
      if (addressDiff != 0) {
        addressDiff = 999;
      }
    }

    var completed = true;
    if (!user.name) {
      completed = false;
    }
    if (!user.surname) {
      completed = false;
    }
    if (!user.address) {
      completed = false;
    }
    if (completed && !user.completionStatus) {
      user.completionStatus = true;
    }

    renewUser(user, res);
    var address = "";
    if (user.address.length > 0) {
      address = parseAddressFull(user.address);
    }

    res.status(200).send({
      id: user._id,
      name: user.name,
      surname: user.surname,
      address: address,
      phone: user.phone,
      email: user.email,
      admin: user.admin,
      profileImage: user.profileImage,
      lastActive: user.lastActive,
      languages: user.languages,
      allowPhoneEdit: !(phoneDiff < 30),
      allowAddressEdit: !(addressDiff < 30),
      completionStatus: user.completionStatus,
      sellerCompleted: user.sellerCompleted,
    });
  });
};

exports.updateUser = (req, res) => {
  User.findOne({
    _id: mongoose.Types.ObjectId(req.userId),
  }).exec(async (err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    const t = i18n(req.headers["accept-language"]);
    var phoneError;
    var addressError;
    var updated = false;
    var stripeName = "";
    if (user.name != req.body.name) {
      user.name = req.body.name;
      stripeName = stripeName + " " + user.name;
      updated = true;
    }
    if (user.surname != req.body.surname) {
      user.surname = req.body.surname;
      stripeName = stripeName + " " + user.surname;
      updated = true;
    }

    if (stripeName) {
      await stripe.customers.update(user.stripeID, { name: stripeName });
    }

    const phoneDiff = differenceInCalendarDays(
      Date.now(),
      user.phoneLastChanged
    );
    const addressDiff = differenceInCalendarDays(
      Date.now(),
      user.addressLastChanged
    );
    if ("+" + user.phone != req.body.phone) {
      if (phoneDiff < 30) {
        phoneError = t("user-update.phone-err");
      } else {
        user.phone = req.body.phone;
        user.phoneLastChanged = Date.now();
        await stripe.customers.update(user.stripeID, { phone: user.phone });
        updated = true;
      }
    }
    if (req.body.latlng) {
      if (!_.isEqual(user.address[0], req.body.address)) {
        if (addressDiff < 30) {
          addressError = t("user-update.address-err");
        } else {
          user.address = req.body.address;
          user.addressLatLng = req.body.latlng;
          user.addressLastChanged = Date.now();
          updated = true;
        }
      }
    }

    user.save();

    if (updated) {
      var message = [t("user-update.update-success")];
    } else {
      var message = {
        message: [t("user-update.nothing-changed")],
        changed: updated,
      };
    }

    var completed = true;
    if (!user.name) {
      completed = false;
    }
    if (!user.surname) {
      completed = false;
    }
    if (!user.address) {
      completed = false;
    }
    if (completed && !user.completionStatus) {
      user.completionStatus = true;
    }

    const address = parseAddressFull(user.address);
    response = {
      id: user._id,
      name: user.name,
      surname: user.surname,
      address: address,
      phone: user.phone,
      email: user.email,
      admin: user.admin,
      profileImage: user.profileImage,
      lastActive: user.lastActive,
      languages: user.languages,
      allowPhoneEdit: !(phoneDiff < 30),
      allowAddressEdit: !(addressDiff < 30),
      message: message,
      completionStatus: user.completionStatus,
    };
    res.status(200).send(response);
  });
};

exports.updateImage = (req, res) => {
  User.findOne({
    _id: mongoose.Types.ObjectId(req.userId),
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    const t = i18n(req.headers["accept-language"]);
    user.profileImage = "ProfilePictures/" + req.file.filename;
    user.save();

    response = {
      profileImage: user.profileImage,
      message: t("user-update.image-success"),
    };
    res.status(200).send(response);
  });
};

exports.sendForgetEmail = (req, res) => {
  User.findOne({ email: req.body.email }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (!user) {
      res.status(404).send({ message: "User with such email does not exist!" });
      return;
    }
    const number = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    PreReg.findOne({ email: req.body.email }).exec((err, prereg) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      var preReg;
      if (!prereg) {
        preReg = new PreReg({
          confirmedEmail: false,
          emailConfirmNumber: number,
          email: req.body.email,
        });
      } else {
        preReg = prereg;
        preReg.confirmedEmail = false;
        preReg.emailConfirmNumber = number;
      }
      preReg.save();
      sendForgotPasswordEmail(req.body.email, number);
      res.status(200).send();
    });
  });
};

exports.resendForgotPassword = (req, res) => {
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
      sendForgotPasswordEmail(req.body.email, number);
      res.status(200).send({ message: "Resent!" });
    });
  } else {
    res.status(404).send({ message: "Email not found" });
  }
};

exports.sendForgotCode = (req, res) => {
  const t = i18n(req.headers["accept-language"]);
  PreReg.findOne({ email: req.body.email }).exec((err, prereg) => {
    if (err) {
      res.status(500).send({ message: "Something went wrong" });
      return;
    }
    if (prereg.emailConfirmNumber === req.body.code) {
      prereg.confirmedEmail = true;
      prereg.save();
      res.status(200).send({ message: "Code Confirmed" });
    } else {
      res.status(401).send({ message: t("prereg.invalid-email") });
    }
  });
};

exports.sendResetPassword = (req, res) => {
  if (res.locals.emailConfirmed) {
    User.findOne({ email: req.body.email }).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      user.password = bcrypt.hashSync(req.body.password, 8);
      user.save();
      res.status(200).send({ message: "Password Changed!" });
    });
  } else {
    res.status(400).send({ message: "Unauthorized" });
  }
};

exports.sendChangePassword = (req, res) => {
  User.findOne({ _id: mongoose.Types.ObjectId(req.userId) }).exec(
    (err, user) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      user.password = bcrypt.hashSync(req.body.password, 8);
      user.save();
      res.status(200).send({ message: "Password Changed!" });
    }
  );
};

exports.registerLender = (req, res) => {
  User.findOne(
    { _id: req.userId, sellerCompleted: false },
    { sellerID: 1 }
  ).exec(async (err, user) => {
    if (err) {
      res.status(500).send({ message: "Something went wrong" });
      return;
    }
    if (!user) {
      res.status(404).send({
        message:
          "User not found or account already registered. If you want to change the details, go to your profile",
      });
      return;
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: user.sellerID,
        refresh_url: `${process.env.WEBSITE_URL}become-a-lender`,
        return_url: `${process.env.WEBSITE_URL}become-a-lender`,
        type: "account_onboarding",
      });
      res.status(200).send({ url: accountLink.url });
    } catch (err) {
      res
        .status(500)
        .send({ message: "Something went wrong, please try again later" });
      return;
    }
  });
};

exports.checkStripeCompletion = (req, res) => {
  User.findOne({ _id: req.userId }).exec(async (err, user) => {
    if (err) {
      res.status(500).send({ message: "Something went wrong" });
      return;
    }
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    var address = "";
    if (user.address.length > 0) {
      address = parseAddressFull(user.address);
    }

    if (!user.sellerCompleted) {
      const account = await stripe.accounts.retrieve(user.sellerID);
      if (account.details_submitted) {
        user.sellerCompleted = true;
        user.save();
      }
    }
    res.status(200).send({
      id: user._id,
      name: user.name,
      surname: user.surname,
      address: address,
      phone: user.phone,
      email: user.email,
      admin: user.admin,
      profileImage: user.profileImage,
      lastActive: user.lastActive,
      languages: user.languages,
      allowPhoneEdit: user.allowPhoneEdit,
      allowAddressEdit: user.allowAddressEdit,
      completionStatus: user.completionStatus,
      sellerCompleted: user.sellerCompleted,
    });
  });
};

exports.userBalance = (req, res) => {
  User.findOne(
    { _id: mongoose.Types.ObjectId(req.userId) },
    { sellerID: 1 }
  ).exec(async (err, user) => {
    if (err) {
      res.status(500).send({ message: "Something went wrong" });
      return;
    }
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: user.sellerID,
      });
      res.status(200).send({
        pending: balance.pending[0].amount,
        available: balance.available[0].amount,
      });
    } catch (err) {
      res.status(500).send({ message: "Something went wrong" });
      return;
    }
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
