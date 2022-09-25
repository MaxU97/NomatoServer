const mongoose = require("mongoose");
const Finance = mongoose.model(
  "Finance",
  new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: String, // "in" or "out"
    amount: Number,
    paymentID: String,
    status: String,
    description: String,
    dateAdded: Date,
  })
);

module.exports = Finance;
