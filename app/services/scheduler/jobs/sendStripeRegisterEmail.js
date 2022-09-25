module.exports = sendStripeRegisterEmail = async (booking) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,
    to: booking.userID.email,
    subject: "IMPORTANT Payment Details",
    template: "striperegisteremail",
    context: {
      name: booking.userID.name,
      userID: booking.userID._id,
      //   href: process.env.WEBSITE_URL + "requests",
    },
  };
  mailer(mailOptions);
};
