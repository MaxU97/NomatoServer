const { verifySignUp } = require("../middlewares");
const { authJwt } = require("../middlewares");
const controller = require("../controllers/auth.controller");

module.exports = function (app, uploadProfilePicture) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post("/api/auth/signup", controller.signup);
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
  app.post("/api/auth/login", [authJwt.validateHuman], controller.signin);
  app.post("/api/auth/sendForgetEmail", controller.sendForgetEmail);
  app.post(
    "/api/auth/resendForgotPassword",
    [verifySignUp.checkPreRegEmail],
    controller.resendForgotPassword
  );

  app.post("/api/auth/sendForgotCode", controller.sendForgotCode);

  app.post(
    "/api/auth/sendResetPassword",
    [verifySignUp.checkEmailConfirmed],
    controller.sendResetPassword
  );

  app.get("/api/auth/me", [authJwt.verifyToken], controller.getSelf);

  app.patch(
    "/api/auth/patchUser",
    [authJwt.verifyToken],
    controller.updateUser
  );
  app.patch(
    "/api/auth/patchAddress",
    [authJwt.verifyToken],
    controller.updateAddress
  );
  app.patch(
    "/api/auth/patchImage",
    [authJwt.verifyToken],
    uploadProfilePicture.single("image"),
    controller.updateImage
  );

  app.patch(
    "/api/auth/sendChangePassword",
    [authJwt.verifyToken, authJwt.verifyPassword],
    controller.sendChangePassword
  );

  app.get(
    "/api/auth/userBalance",
    [authJwt.verifyToken],
    controller.userBalance
  );

  app.post(
    "/api/auth/createStripeAccount",
    [authJwt.verifyToken],
    controller.createStripeAccount
  );
};
