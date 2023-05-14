module.exports = sendWarnEmail = async (userEmail, reason, warnings) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,

    to: userEmail,
    subject: "A Warning has been issued",
    template: "warnnotification",
    context: {
      reason,
      warnings,
    },
  };
  mailer(mailOptions);
};
