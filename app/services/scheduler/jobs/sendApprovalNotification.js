module.exports = sendApprovalNotification = async (booking) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,

    to: booking.userID.email,
    subject: "Booking Request Approved",
    template: "bookingapproved",
    context: {
      name: booking.userID.name,
      item_name: booking.itemID.title,
      img_src: booking.itemID.images[0],
      item_dateStart: booking.dateStart.toLocaleString("EN", {
        day: "numeric",
        month: "short",
      }),
      item_dateEnd: booking.dateEnd.toLocaleString("EN", {
        day: "numeric",
        month: "short",
      }),
      href: process.env.WEBSITE_URL + "item/" + booking.itemID._id,
    },
  };
  mailer(mailOptions);
};
