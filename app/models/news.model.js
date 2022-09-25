const mongoose = require("mongoose");
const News = mongoose.model(
  "News",
  new mongoose.Schema({
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    language: String,
    body: String,
    title: String,
    image: String,
    dateAdded: Date,
    hidden: { type: Boolean, required: true, default: false },
    deleted: { type: Boolean, required: true, default: false },
  })
);

module.exports = News;
