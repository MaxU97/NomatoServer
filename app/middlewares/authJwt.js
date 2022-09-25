const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Role = db.role;
var bcrypt = require("bcryptjs");
const axios = require("axios");

validateHuman = async (req, res, next) => {
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
          res.status(400).send({ message: "ReCaptcha Failed" });
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
  let token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }
  jwt.verify(token, config.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    next();
  });
};

verifyInOp = (req, res, next) => {
  let token = req.headers["x-access-token"];
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }
  if (token === process.env.AUTO_UPDATER_TOKEN) {
    next();
  }
};

isAdmin = (req, res, next) => {
  User.findById(req.userId).exec((err, user) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (user.admin) {
      next();
      return;
    } else {
      res.status(403).send({ message: "Require Admin Role!" });
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
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    next();
  });
};

isCompletedAccount = (req, res, next) => {
  if (req.userId != null) {
    User.findById(req.userId).exec((err, user) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
      if (user.completionStatus) {
        next();
      } else {
        res.status(403).send({ message: "Your profile is not complete" });
        return;
      }
    });
  } else {
    next();
  }
};

verifyPassword = (req, res, next) => {
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
        res.status(401).send({ message: "You must enter the old password" });
        return;
      }

      if (passwordIsValid) {
        if (req.body.password) {
          samePassword = bcrypt.compareSync(req.body.password, user.password);
        }

        if (samePassword) {
          res.status(401).send({
            message: "The new password must be different to the old password",
          });
          return;
        }
        next();
      } else {
        res.status(401).send({ message: "The old password is wrong" });
      }
    });
  } else {
    res.status(401).send({ message: "Not Authorised" });
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
