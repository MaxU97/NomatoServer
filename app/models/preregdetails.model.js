const mongoose = require("mongoose");
const PreRegDetails = mongoose.model(
  "PreRegDetails",
  new mongoose.Schema({
    email: String,
    emailConfirmNumber: String,
    phone: String,
    phoneConfirmNumber: String,
    password: String,
    confirmedEmail: { type: Boolean, default: false },
    resentEmailDate: Date,
    confirmedPhone: { type: Boolean, default: false },
    resentPhoneDate: Date,
    languages: [{ type: String }],
  })
);

module.exports = PreRegDetails;
