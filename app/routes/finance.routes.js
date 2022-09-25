const { authJwt } = require("../middlewares");
const controller = require("../controllers/finance.controller");
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.post("/api/finance/withdraw", [authJwt.verifyToken], controller.withdraw);
};
