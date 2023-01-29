const mongoose = require("mongoose");

const ItemExtra = mongoose.model(
  "ItemExtra",
  new mongoose.Schema({
    title: { type: Array },
    description: { type: Array },
    price: { type: Number, required: true },
  })
);

module.exports = ItemExtra;
