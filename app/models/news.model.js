const mongoose = require("mongoose");
const News = mongoose.model(
  "News",
  new mongoose.Schema({
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateAdded: Date,
    deleted: { type: Boolean, required: true, default: false },
  })
);

module.exports = News;
