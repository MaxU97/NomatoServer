module.exports = sendForgotPasswordEmail = async (email, code) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,
    to: email,
    subject: "Reset Password",
    template: "forgetemail",
    context: {
      code: code,
    },
  };
  mailer(mailOptions);
};
