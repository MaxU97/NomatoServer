const mongoose = require("mongoose");
const NewsRU = mongoose.model(
  "NewsRU",
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

module.exports = NewsRU;
