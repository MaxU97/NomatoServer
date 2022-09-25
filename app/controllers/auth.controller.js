const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const PreReg = db.preregdetails;
const Finance = db.finance;
const differenceInCalendarDays = require("date-fns/differenceInCalendarDays");
var jwt = require("jsonwebtoken");
var bcrypt = require("bcryptjs");
const i18n = require("../../locales/i18n");
const sendEmailConfirmation = require("../services/scheduler/jobs/sendEmailConfirmation");
const {
  parseAddress,
  parseAddressFull,
  parseAddressSpecific,
  addressType,
} = require("../utility/addressUtilities");
const sendForgotPasswordEmail = require("../services/scheduler/jobs/sendForgotPasswordEmail");
const stripe = require("stripe")(process.env.STRIPE_KEY);
const _ = require("lodash");
const { getFinances } = require("../utility/financeUtility");
const axios = require("axios");

exports.signup = async (req, res) => {
  PreReg.findOneAndDelete({
    _id: mongoose.Types.ObjectId(req.body._id),
  }).exec(async (err, prereg) => {
    const user = new User({
      email: prereg.email,
      phone: prereg.phone,
      phoneLastChanged: Date.now(),
      password: prereg.password,
      lastActive: Date.now(),
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

exports.signin = async (req, res) => {
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
  // // http://api1.esteria.lv/send?api-key=%api-key%&sender=%sender%&number=%number%&text=%text%
  // var axios = require("axios");
  // const t = i18n(req.headers["accept-language"]);
  // const text = t("phone-message") + " " + code;
  // const sender = "NomaTo";
  // const api = process.env.SMS_API;
  // const number = req.body.phone;
  // const url = `https://api1.esteria.lv/send?api-key=${api}&sender=${sender}&number=${number}&text=${text}`;
  // axios
  //   .get(url)
  //   .then((res) => {
  //     console.log(res);
  //     if (res.data < 100) {
  //       throw "Something went wrong";
  //     }
  //   })
  //   .catch((error) => {
  //     throw error;
  //   });
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
      completionStatus: user.completionStatus,
      sellerCompleted: !!user.customerID,
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
    if (user.name != req.body.name) {
      user.name = req.body.name;
      updated = true;
    }
    if (user.surname != req.body.surname) {
      user.surname = req.body.surname;
      updated = true;
    }

    const phoneDiff = differenceInCalendarDays(
      Date.now(),
      user.phoneLastChanged
    );

    if ("+" + user.phone != req.body.phone) {
      if (phoneDiff < 30) {
        phoneError = t("user-update.phone-err");
      } else {
        user.phone = req.body.phone;
        user.phoneLastChanged = Date.now();
        updated = true;
      }
    }
    if (req.body.latlng) {
      if (!_.isEqual(user.address[0], req.body.address)) {
        user.address = req.body.address;
        if (
          !parseAddressSpecific(
            req.body.address.address_components,
            addressType.number
          )
        ) {
          res.status(500).send({
            message:
              "Please make sure you choose an address that has a street number",
          });
          return;
        }
        user.addressLatLng = req.body.latlng;
        updated = true;
      }
    }

    user.save();

    if (updated) {
      var message = {
        message: [t("user-update.update-success")],
        changed: updated,
      };
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
      message: message,
      completionStatus: user.completionStatus,
      sellerCompleted: !!user.customerID,
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

exports.userBalance = (req, res) => {
  User.findOne({ _id: mongoose.Types.ObjectId(req.userId) }).exec(
    async (err, user) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      if (!user) {
        res.status(404).send({ message: "User not found" });
        return;
      }
      try {
        if (user.customerID) {
          const account = await stripe.balance.retrieve({
            stripeAccount: user.customerID,
          });
          res.status(200).send({
            pending: account.pending[0].amount,
            available: account.available[0].amount,
          });
        } else {
          res.status(200).send({
            pending: 0,
            available: 0,
          });
        }
      } catch (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
    }
  );
};

exports.createStripeAccount = (req, res) => {
  User.findOne({ _id: mongoose.Types.ObjectId(req.userId) }).exec(
    async (err, user) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      if (!user) {
        res.status(404).send({ message: "User not found" });
        return;
      }
      if (!req.body.name || !req.body.surname || !req.body.iban) {
        res.status(404).send({ message: "Please submit all details" });
        return;
      }

      const address = {
        line1:
          parseAddressSpecific(
            user.address[0].address_components,
            addressType.number
          ) +
          ", " +
          parseAddressSpecific(
            user.address[0].address_components,
            addressType.road
          ) +
          ", " +
          parseAddressSpecific(
            user.address[0].address_components,
            addressType.sublocality
          ),
        postal_code:
          "LV-" +
          parseAddressSpecific(
            user.address[0].address_components,
            addressType.postCode
          ),
        city: parseAddressSpecific(
          user.address[0].address_components,
          addressType.locality
        ),
      };

      if (!user.customerID) {
        const account = await stripe.accounts.create({
          country: "LV",
          type: "custom",
          business_type: "individual",
          settings: {
            payouts: {
              schedule: {
                interval: "manual",
              },
            },
          },

          business_profile: {
            mcc: 7394,
            url: "nomato.eu/test",
          },
          tos_acceptance: {
            ip: req.socket.remoteAddress,
            date: Math.floor(Date.now() / 1000),
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          individual: {
            first_name: user.name,
            last_name: user.surname,
            dob: {
              day: 14,
              month: 10,
              year: 1997,
            },
            address: address,
            email: user.email,
            phone: "+" + user.phone,
          },
        });
        user.customerID = account.id;
        user.save();
      }

      //TODO UPDATE EMAIL AND ADDRESS ON CHANGE
      //TODO ADD A CHECK IF ADDRESS CONTAINS POSTALCODE
      //TODO REPLACE THE DEFAULT EXTERNAL ACCOUNT
      try {
        const token = await stripe.tokens.create({
          bank_account: {
            country: "LV",
            currency: "eur",
            account_holder_name: req.body.name + " " + req.body.surname,
            account_holder_type: "individual",
            account_number: req.body.iban,
          },
        });

        await stripe.accounts
          .createExternalAccount(user.customerID, {
            external_account: token.id,
            default_for_currency: true,
          })
          .then(async (response) => {
            res
              .status(200)
              .send({ message: "Your bank account has been linked" });
          });
      } catch (err) {
        res.status(err.statusCode).send({ message: err.message });
      }
    }
  );
};

const renewUser = (user, res) => {
  user.lastActive = Date.now();
  user.save((err) => {
    if (err) {
      res.status(500).send({ message: err });
    }
  });
};
