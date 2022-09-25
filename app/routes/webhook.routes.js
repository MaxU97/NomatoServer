const controller = require("../controllers/webhooks.controller");
const express = require("express");
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    controller.endpoint
  );
};
