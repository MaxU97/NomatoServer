const { verifySignUp } = require("../middlewares").default;
const { authJwt } = require("../middlewares").default;
const controller = require("../controllers/auth.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post(
    "/api/auth/signup",
    [verifySignUp.checkDuplicateEmail],
    controller.signup
  );
  app.post(
    "/api/auth/preRegEmail",
    [verifySignUp.checkDuplicateEmail, verifySignUp.checkPreRegEmail],
    controller.preRegEmail
  );

  app.post(
    "/api/auth/preRegPhone",
    [verifySignUp.checkDuplicatePhone],
    controller.preRegPhone
  );
  app.post("/api/auth/confirmEmail", controller.confirmEmail);
  app.post(
    "/api/auth/resendEmailCode",
    [verifySignUp.checkPreRegEmail, verifySignUp.checkEmailTimeout],
    controller.resendEmailCode
  );
  app.post(
    "/api/auth/resendPhoneCode",
    [verifySignUp.checkPreRegEmail, verifySignUp.checkPhoneTimeout],
    controller.resendPhoneCode
  );
  app.post("/api/auth/confirmPhone", controller.confirmPhone);
  app.post("/api/auth/login", controller.signin);
  app.get("/api/auth/me", [authJwt.verifyToken], controller.getSelf);
};
