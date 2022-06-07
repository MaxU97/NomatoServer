const mongoose = require("mongoose");
const NewsImage = mongoose.model(
  "NewsImage",
  new mongoose.Schema({
    newsID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "News",
      required: true,
    },
    imageURL: { type: String, required: true },
    main: { type: Boolean, required: true, default: false },
  })
);

module.exports = NewsImage;
