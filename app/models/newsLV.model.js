const mongoose = require("mongoose");
const NewsLV = mongoose.model(
  "NewsLV",
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

module.exports = NewsLV;
