const { authJwt } = require("../middlewares").default;
const controller = require("../controllers/news.controller");
module.exports = function (app, upload) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post(
    "/api/news/upload",
    [authJwt.verifyToken, authJwt.isAdmin],
    upload.array("files", 5),
    controller.upload
  );
  app.get("/api/news/getNews", controller.getNews);
  app.get("/api/news/getNewsSpecific", controller.getNewsSpecific);
};
