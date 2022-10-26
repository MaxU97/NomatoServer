module.exports = sendSupportEmail = async (email) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `<${email.email}>`,
    to: process.env.EMAIL,
    subject: `Nomato Support Ticket ${email.subject}`,
    template: "supportemail",
    context: {
      userID: email.userID,
      email: email.email,
      message: email.message,
    },
  };
  mailer(mailOptions);
};
