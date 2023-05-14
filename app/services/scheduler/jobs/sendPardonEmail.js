module.exports = sendBanEmail = async (userEmail) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,

    to: userEmail,
    subject: "Your Account was Pardoned",
    template: "pardonnotification",
  };
  mailer(mailOptions);
};
