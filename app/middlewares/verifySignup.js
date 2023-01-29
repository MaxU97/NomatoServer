const db = require("../models");
const User = db.user;
const PreReg = db.preregdetails;
const i18n = require("../../locales/i18n");
checkDuplicateEmail = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findOne({
    email: req.body.email.toLowerCase().replace(/\s/g, ""),
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (user) {
      res.status(400).send({ message: t("reg.email-used") });
      return;
    }
    next();
  });
};

checkPreRegEmail = (req, res, next) => {
  PreReg.findOne({
    email: req.body.email.toLowerCase().replace(/\s/g, ""),
  }).exec((err, prereg) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (prereg) {
      res.locals.emailExists = true;
    } else {
      res.locals.emailExists = false;
    }
    next();
  });
};

checkEmailConfirmed = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  PreReg.findOneAndDelete({
    email: req.body.email.toLowerCase().replace(/\s/g, ""),
  }).exec((err, prereg) => {
    if (prereg) {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (prereg.confirmedEmail) {
        res.locals.emailConfirmed = true;
      } else {
        res.locals.emailConfirmed = false;
      }
    } else {
      res.status(401).send({
        message: t("reg.pw-reset-restart"),
      });
      return;
    }

    next();
  });
};

checkDuplicatePhone = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findOne({
    phone: req.body.phone,
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (user) {
      res.status(400).send({ message: t("reg.phone-used") });
      return;
    }
    next();
  });
};

checkEmailTimeout = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  PreReg.findOne({
    email: req.body.email.toLowerCase(),
  }).exec((err, prereg) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (prereg.resentEmailDate) {
      timeout = Date.now() - prereg.resentEmailDate;
      if (timeout < 55000) {
        res.status(401).send({ message: t("reg.code-wait") });
      } else {
        next();
      }
    } else {
      next();
    }
  });
};

checkPhoneTimeout = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  PreReg.findOne({
    email: req.body.email.toLowerCase(),
    phone: req.body.phone,
  }).exec((err, prereg) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }

    if (prereg) {
      if (prereg.resentPhoneDate) {
        timeout = Date.now() - prereg.resentPhoneDate;
        if (timeout < 55000) {
          res.status(401).send({
            message: t("reg.code-wait"),
          });
        } else {
          res.locals.emailExists = true;
          next();
        }
      } else {
        res.locals.emailExists = true;
        next();
      }
    } else {
      res.status(404).send({ message: t("reg.not-found") });
    }
  });
};

const verifySignUp = {
  checkDuplicateEmail,
  checkEmailTimeout,
  checkPhoneTimeout,
  checkDuplicatePhone,
  checkPreRegEmail,
  checkEmailConfirmed,
};

module.exports = verifySignUp;
