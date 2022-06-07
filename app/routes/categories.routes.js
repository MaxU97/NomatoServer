const { authJwt } = require("../middlewares");
const controller = require("../controllers/categories.controller");

module.exports = (app, uploadIcon) => {
  app.get("/api/categories/get", controller.getCategories);

  app.post(
    "/api/categories/createCategory",
    [authJwt.verifyToken, authJwt.isAdmin],
    uploadIcon.single("image"),
    controller.createCategory
  );
  app.post(
    "/api/categories/checkExisting",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.checkExisting
  );

  app.post(
    "/api/categories/deleteCategory",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.deleteCategory
  );
  app.post(
    "/api/categories/checkCategoryDependancies",
    [authJwt.verifyToken, authJwt.isAdmin],
    controller.checkCategoryDependancies
  );
};
