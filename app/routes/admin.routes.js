const { authJwt } = require("../middlewares");
const controller = require("../controllers/admin.controller");

module.exports = function (app, uploadProfilePicture) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post(
    "/api/admin/ban",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.ban
  );
  app.post(
    "/api/admin/warn",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.warn
  );
  app.post(
    "/api/admin/removeWarnings",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.removeWarnings
  );
  app.post(
    "/api/admin/toggleAdmin",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.toggleAdmin
  );
  app.get(
    "/api/admin/getUserRequests",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getUserRequests
  );
  app.get(
    "/api/admin/getUserBookings",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getUserBookings
  );
  app.get(
    "/api/admin/getUserList",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getUserList
  );

  app.get(
    "/api/admin/getNewsList",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.getNewsList
  );
};
