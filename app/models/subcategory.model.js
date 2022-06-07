const mongoose = require("mongoose");

const SubCategory = mongoose.model(
  "SubCategory",
  new mongoose.Schema({
    titleRU: String,
    titleLV: String,
    titleEN: String,
  })
);

module.exports = SubCategory;
