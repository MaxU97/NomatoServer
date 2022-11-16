module.exports = sendSupportEmail = async (email) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: process.env.EMAIL,
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
