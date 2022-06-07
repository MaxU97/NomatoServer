const mongoose = require("mongoose");

const ItemReview = mongoose.model(
  "ItemReview",
  new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: String,
  })
);

module.exports = ItemReview;
