module.exports = sendReviewRequest = async (booking) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,

    to: booking.userID.email,
    subject: "Thank you for renting with us!",
    template: "reviewrequest",
    context: {
      name: booking.userID.name,
      item_name: booking.itemID.title,
      owner_name: booking.ownerID.name,
    },
  };
  mailer(mailOptions);
};
