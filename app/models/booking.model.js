const mongoose = require("mongoose");

const Booking = mongoose.model(
  "Booking",
  new mongoose.Schema({
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    ownerID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    itemID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    extras: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ItemExtra",
        required: false,
      },
    ],
    comment: String,
    refuseReason: String,
    reviewed: Boolean,
    dateStart: Date,
    dateEnd: Date,
    qtyWant: Number,
    status: String,
    piid: String,
    intentID: String,
    chargeID: String,
    created: Date,
  })
);

module.exports = Booking;
