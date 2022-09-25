module.exports = sendPayoutStarted = async (email, amount) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,
    to: email,
    subject: "Pay out started",
    context: {
      amount: amount,
    },
    template: "bankpayout",
  };
  mailer(mailOptions);
};
