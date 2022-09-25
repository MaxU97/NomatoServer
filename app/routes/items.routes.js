const { authJwt } = require("../middlewares");
const controller = require("../controllers/items.controller");
module.exports = function (app, upload) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post(
    "/api/item/upload",
    [authJwt.verifyToken, authJwt.isCompletedAccount],
    upload.array("images", 5),
    controller.upload
  );
  app.patch(
    "/api/item/update",
    [authJwt.verifyToken, authJwt.appendAdmin],
    upload.array("images", 5),
    controller.update
  );
  app.post(
    "/api/item/delete",
    [authJwt.verifyToken, authJwt.appendAdmin],
    controller.delete
  );
  app.post(
    "/api/item/get",
    [authJwt.appendUser, authJwt.appendAdmin],
    controller.get
  );
  app.patch(
    "/api/item/toggleVisibility",
    [authJwt.verifyToken, authJwt.appendAdmin],
    controller.toggleVisibility
  );
  app.get("/api/item/getpopular", controller.getPopular);
  app.get("/api/item/me", [authJwt.verifyToken], controller.getSelf);
  app.post("/api/item/search", controller.searchItems);
  app.get(
    "/api/item/reviewItem",
    [authJwt.verifyToken],
    controller.getForReview
  );
  app.post(
    "/api/item/submitReview",
    [authJwt.verifyToken],
    controller.submitReview
  );
};
