const { authJwt } = require("../middlewares");
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
    upload.array("files"),
    controller.upload
  );
  app.get("/api/news/getNews", controller.getNews);
  app.get("/api/news/get", controller.get);
  app.patch(
    "/api/news/toggleVisibility",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.toggleVisibility
  );
  app.patch(
    "/api/news/update",
    [authJwt.verifyToken, authJwt.isAdmin],
    upload.array("files"),
    controller.update
  );
  app.patch(
    "/api/news/delete",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.delete
  );
};
