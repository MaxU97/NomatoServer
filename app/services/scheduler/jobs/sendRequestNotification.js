require("dotenv").config();
const mailer = require("./mailer");
const Logger = require("../../logger/logger.service")
const logger = new Logger("email");

module.exports = sendRequestNotification = async (booking) => {
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

  logger.debug("sendRequestNotification", mailOptions);

  mailer(mailOptions);
};
