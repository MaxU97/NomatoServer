const { authJwt } = require("../middlewares");
const controller = require("../controllers/booking.controller");
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/booking/request", [authJwt.verifyToken], controller.request);

  app.post(
    "/api/booking/recordBooking",
    [authJwt.verifyToken],
    controller.recordBooking
  );

  app.get(
    "/api/booking/getBookingHistory",
    [authJwt.verifyToken],
    controller.getBookingHistory
  );
  app.get(
    "/api/booking/getRequests",
    [authJwt.verifyToken],
    controller.getRequests
  );

  app.get(
    "/api/booking/getUnapprovedRequestCount",
    [authJwt.verifyToken],
    controller.getUnapprovedRequestCount
  );

  app.post(
    "/api/booking/sendBookingToOwner",
    [authJwt.verifyToken],
    controller.sendBookingToOwner
  );

  app.post(
    "/api/booking/cancelBooking",
    [authJwt.verifyToken],
    controller.cancelBooking
  );

  app.post(
    "/api/booking/refuseBooking",
    [authJwt.verifyToken],
    controller.refuseBooking
  );

  app.post(
    "/api/booking/approveBooking",
    [authJwt.verifyToken],
    controller.approveBooking
  );

  app.post(
    "/api/booking/getApprovedUser",
    [authJwt.verifyToken],
    controller.getApprovedUser
  );

  app.get("/api/booking/getServiceFee", controller.getServiceFee);

  app.post("/api/booking/scanQR", [authJwt.verifyToken], controller.scanQR);

  app.get(
    "/api/booking/checkPendingReview",
    [authJwt.verifyToken],
    controller.checkReviewedBookings
  );

  app.post("/api/booking/getQrHash", [authJwt.verifyToken], controller.qrHash);

  app.post(
    "/api/booking/getQty",
    [authJwt.verifyToken],
    controller.getAvailableQty
  );

  app.post(
    "/api/booking/checkApprovedBookings",
    [authJwt.verifyInOp],
    controller.checkApprovedBookings
  );
  app.post(
    "/api/booking/checkBookings",
    [authJwt.verifyInOp],
    controller.checkExpiredBookings
  );
};
