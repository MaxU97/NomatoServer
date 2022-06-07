const mongoose = require("mongoose");
const NewsEN = mongoose.model(
  "NewsEN",
  new mongoose.Schema({
    newsID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
    },
    title: String,
    short_text: String,
    text: String,
  })
);

module.exports = NewsEN;
