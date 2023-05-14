module.exports = sendItemReview = async (item, userID, edit = false) => {
  const mailer = require("./mailer");
  require("dotenv").config();

  var mailOptions = {
    from: process.env.EMAIL,
    to: process.env.EMAIL,
    subject: `${edit ? "Edited Item" : "Item"} for review`,
    template: "itemreviewemail",
    context: {
      item_name: item.title,
      userId: userID,
      link: `${process.env.WEBSITE_URL}item/${item._id}`,
    },
  };
  mailer(mailOptions);
};
