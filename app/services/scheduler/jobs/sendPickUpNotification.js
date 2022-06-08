const sendPickUpNotification = async () => {
  const db = require("../../../models");
  const Booking = db.booking;
  const User = db.user;
  const dbConfig = require("../../../config/db.config");
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: `"Nomato" <${process.env.EMAIL}>`,
    to: "",
    subject: "Pick-up Notification",
    template: "pickupnotice",
    context: {},
  };

  db.mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Successfully connect to MongoDB.");
    })
    .catch((err) => {
      console.error("Connection error", err);
      process.exit();
    });

  User.find({}).exec((err, users) => {
    if (err) {
      throw err;
    }

    users.forEach((user) => {
      Booking.find({
        userID: user._id,
        dateStart: {
          $lte: new Date(Date.now() - 12 * 60 * 60 * 1000 + 1000 * 86400 * 3),
        },
        status: "approved",
      })
        .populate({ path: "itemID" })
        .exec((err, bookings) => {
          if (err) {
            throw err;
          }
          if (bookings.length == 1) {
            mailOptions.to = user.email;
            mailOptions.context = {
              name: user.name,
              item_name: bookings[0].itemID.title,
              img_src: process.env.API_URL + bookings[0].itemID.images[0],
              item_dateStart: bookings[0].dateStart.toLocaleString("EN", {
                day: "numeric",
                month: "short",
              }),
              item_dateEnd: bookings[0].dateEnd.toLocaleString("EN", {
                day: "numeric",
                month: "short",
              }),
              itemID: bookings[0].itemID._id,
            };
            mailer(mailOptions);
          } else if (bookings.length > 1) {
            let detailsArray = [];
            bookings.forEach((booking) => {
              detailsArray.push({
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
                itemID: booking.itemID._id,
              });
            });
            mailOptions.to = user.email;
            mailOptions.template = "pickupnoticemultiple";
            mailOptions.context = {
              name: user.name,
              list: detailsArray,
            };
            mailer(mailOptions);
          }
        });
    });
  });

  console.log("");
  // console.log("ENTERED SEND PICK UP NOTIFICATION");
  // require("./mailer")(mailOptions);
};

sendPickUpNotification().catch((err) => console.log(err));
