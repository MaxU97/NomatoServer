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
    [authJwt.verifyToken],
    upload.array("images", 5),
    controller.upload
  );
  app.post("/api/item/get", controller.get);
  app.get("/api/item/getpopular", controller.getPopular);
};
