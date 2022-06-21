const db = require("../models");
const User = db.user;
const PreReg = db.preregdetails;

checkDuplicateEmail = (req, res, next) => {
  User.findOne({
    email: req.body.email,
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (user) {
      res.status(400).send({ message: "Email is already in use!" });
      return;
    }
    next();
  });
};

checkPreRegEmail = (req, res, next) => {
  PreReg.findOne({
    email: req.body.email,
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
  PreReg.findOneAndDelete({
    email: req.body.email,
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
        message: "Please restart password reset. Something went wrong",
      });
      return;
    }

    next();
  });
};

checkDuplicatePhone = (req, res, next) => {
  User.findOne({
    phone: req.body.phone,
  }).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (user) {
      res.status(400).send({ message: "Phone is already in use!" });
      return;
    }
    next();
  });
};

checkEmailTimeout = (req, res, next) => {
  PreReg.findOne({
    email: req.body.email,
  }).exec((err, prereg) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (prereg.resentEmailDate) {
      timeout = Date.now() - prereg.resentEmailDate;
      if (timeout < 55000) {
        res
          .status(401)
          .send({ message: "You need to wait before requesting a code again" });
      } else {
        next();
      }
    } else {
      next();
    }
  });
};

checkPhoneTimeout = (req, res, next) => {
  PreReg.findOne({
    email: req.body.email,
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
            message: "You need to wait before requesting a code again",
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
      res.status(404).send({ message: "Not Found" });
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
