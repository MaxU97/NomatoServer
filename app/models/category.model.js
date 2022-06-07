const mongoose = require("mongoose");

const Category = mongoose.model(
  "Category",
  new mongoose.Schema({
    imageURL: String,
    titleRU: String,
    titleLV: String,
    titleEN: String,
    subcats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
      },
    ],
  })
);

module.exports = Category;
