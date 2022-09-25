const mongoose = require("mongoose");

const Review = mongoose.model(
  "Review",
  new mongoose.Schema({
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    itemID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    language: String,
    text: String,
    datePosted: Date,
    type: String, //"positive" or "negative"
  })
);

module.exports = Review;
