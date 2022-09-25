module.exports = sendBankErrorNotificaiton = async (email) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,
    to: email,
    subject: "URGENT PAYMENT INFORMATION",
    template: "bankerror",
  };
  mailer(mailOptions);
};
