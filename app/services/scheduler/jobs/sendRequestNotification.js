module.exports = sendRequestNotification = async (booking) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,
    to: booking.ownerID.email,
    subject: "Booking Requested",
    template: "bookingrequested",
    context: {
      name: booking.ownerID.name,
      item_name: booking.itemID.title,
      img_src: process.env.API_URL + booking.itemID.images[0],
      item_dateStart: booking.dateStart.toLocaleString("EN", {
        day: "numeric",
        month: "short",
      }),
      item_dateEnd: booking.dateEnd.toLocaleString("EN", {
        day: "numeric",
        month: "short",
      }),
      href: process.env.WEBSITE_URL + "requests",
    },
  };
  mailer(mailOptions);
};
