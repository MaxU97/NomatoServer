const i18n = require("../../locales/i18n");
const sendSupportEmail = require("../services/scheduler/jobs/sendSupportEmail.js");
exports.sendSupport = async (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  if (!req.body.email || !req.body.subject || !req.body.message) {
    res.status(400).send({ message: t("error") });
    return;
  }
  var email = req.body;
  if (req.userId) {
    email.userID = req.userId;
  } else {
    email.userID = "undefined";
  }
  await sendSupportEmail(email);
  res.status(200).send({ message: t("support.sent") });
};
