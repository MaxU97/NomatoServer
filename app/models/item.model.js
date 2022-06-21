const mongoose = require("mongoose");

const Schema = new mongoose.Schema({
  title: { type: String, required: true },
  images: [{ type: String, required: true }],
  address: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  addressNatural: Array,
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  subcat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubCategory",
  },
  descEN: { type: String, required: true },
  descLV: { type: String, required: true },
  descRU: { type: String, required: true },
  itemQty: { type: Number, required: true },
  itemValue: { type: Number, required: true },
  minRent: { type: Number, required: true },
  rentPriceDay: { type: Number, required: true },
  rentPriceWeek: { type: Number, required: true },
  rentPriceMonth: { type: Number, required: true },
  likes: { type: Number, required: true },
  dislikes: { type: Number, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "ItemReview" }],
  tagCloud: [String],
});

Schema.index({ address: "2dsphere" });
const Item = mongoose.model("Item", Schema);

module.exports = Item;
