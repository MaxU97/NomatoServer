const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Role = db.role;
var bcrypt = require("bcryptjs");
const axios = require("axios");
const i18n = require("../../locales/i18n");
validateHuman = async (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  if (req.body.token) {
    const response = await axios
      .post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_TOKEN}&response=${req.body.token}`
      )
      .then(({ data }) => {
        console.log(data.success);
        if (data.success) {
          next();
        } else {
          res.status(400).send({ message: t("auth.captcha-failed") });
        }
      })
      .catch((err) => {
        throw err;
      });
  } else {
    next();
  }
};

verifyToken = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  let token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send({ message: t("auth.no-token") });
  }
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: t("auth.unauth") });
    }
    req.userId = decoded.id;
    next();
  });
};

verifyInOp = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  let token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send({ message: t("auth.no-token") });
  }
  if (token === process.env.AUTO_UPDATER_TOKEN) {
    next();
  }
};

isAdmin = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (user.admin) {
      next();
      return;
    } else {
      res.status(403).send({ message: t("auth.req-admin") });
      return;
    }
  });
};

appendAdmin = (req, res, next) => {
  if (req.userId != null) {
    User.findById(req.userId).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      req.isAdmin = user.admin;
      next();
    });
  } else {
    next();
  }
};

appendUser = (req, res, next) => {
  let token = req.headers["x-access-token"];
  if (token == "null" || token == null) {
    req.userId = null;
    next();
    return;
  }
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: t("auth.unauth") });
    }
    req.userId = decoded.id;
    next();
  });
};

isCompletedAccount = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  if (req.userId != null) {
    User.findById(req.userId).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (user.completionStatus) {
        next();
      } else {
        res.status(403).send({ message: t("auth.no-profile") });
        return;
      }
    });
  } else {
    next();
  }
};

verifyPassword = (req, res, next) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  if (req.userId != null) {
    User.findById(req.userId).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      var passwordIsValid;
      if (req.body.oldPassword) {
        passwordIsValid = bcrypt.compareSync(
          req.body.oldPassword,
          user.password
        );
      } else {
        res.status(401).send({ message: t("auth.no-old-pw") });
        return;
      }

      if (passwordIsValid) {
        if (req.body.password) {
          samePassword = bcrypt.compareSync(req.body.password, user.password);
        }

        if (samePassword) {
          res.status(401).send({
            message: t("auth.new-is-old-pw"),
          });
          return;
        }
        next();
      } else {
        res.status(401).send({ message: t("auth.old-pw-wrong") });
      }
    });
  } else {
    res.status(401).send({ message: t("auth.unauth") });
  }
};
const authJwt = {
  verifyInOp,
  verifyToken,
  verifyPassword,
  isAdmin,
  appendAdmin,
  appendUser,
  isCompletedAccount,
  validateHuman,
};

module.exports = authJwt;
