const jwt = require("jsonwebtoken");
const config = require("../config/auth.config.js");
const db = require("../models");
const User = db.user;
const Role = db.role;

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
  if (token == null) {
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
isCompletedAccount = () => {};

const authJwt = {
  verifyToken,
  isAdmin,
  appendAdmin,
  appendUser,
};

module.exports = authJwt;
