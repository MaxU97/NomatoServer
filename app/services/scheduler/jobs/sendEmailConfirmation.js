module.exports = sendRequestNotification = async (email, code) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,
    to: email,
    subject: "Confirmation Code",
    template: "emailconfirmation",
    context: {
      code: code,
    },
  };
  mailer(mailOptions);
};
