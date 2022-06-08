const controller = require("../controllers/profile.controllers");

const { authJwt } = require("../middlewares");

module.exports = function (app, upload) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post(
    "/api/updateProfile",
    [authJwt.verifyToken, upload.single("file")],
    controller.updateProfile
  );
};
