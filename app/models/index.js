const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.category = require("./category.model");
db.subcategory = require("./subcategory.model");
db.news = require("./news.model");
db.user = require("./user.model");
db.item = require("./item.model");
db.itemreview = require("./itemreview.model");
db.itemextra = require("./itemextra.model");
db.booking = require("./booking.model");
db.preregdetails = require("./preregdetails.model");
db.finance = require("./finance.model");
db.review = require("./review.model");

module.exports = db;
