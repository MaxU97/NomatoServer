const mongoose = require("mongoose");
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    name: { type: String },
    surname: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    phoneLastChanged: Date,
    address: Array,
    addressLatLng: Object,
    addressLastChanged: Date,
    password: { type: String, required: true },
    admin: { type: Boolean, required: true, default: false },
    profileImage: {
      type: String,
      required: true,
      default: "defaultProfile.svg",
    },
    stripeID: { type: String, required: true },
    stripeSetupID: { type: String, required: false },
    lastActive: Date,
    languages: { type: [String], default: ["EN", "RU", "LV"] },
    completionStatus: { type: Boolean, default: false },
  })
);

module.exports = User;
