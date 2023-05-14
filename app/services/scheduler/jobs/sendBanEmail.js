module.exports = sendBanEmail = async (userEmail, reason) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,

    to: userEmail,
    subject: "Your Account was Banned",
    template: "bannotification",
    context: {
      reason,
    },
  };
  mailer(mailOptions);
};
