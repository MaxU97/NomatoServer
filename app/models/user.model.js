const mongoose = require("mongoose");
const User = mongoose.model(
  "User",
  new mongoose.Schema({
    name: { type: String },
    surname: { type: String },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    phoneLastChanged: Date,
    address: Object,
    addressLatLng: Object,
    password: { type: String, required: true },
    admin: { type: Boolean, required: true, default: false },
    profileImage: {
      type: String,
      required: true,
      default: "defaultProfile.svg",
    },
    lastActive: Date,
    languages: { type: [String], default: ["EN", "RU", "LV"] },
    customerID: String,
    completionStatus: { type: Boolean, default: false },
    suspended: { type: Boolean, default: false },
    warnings: { type: Number, default: 0 },
  })
);

module.exports = User;
