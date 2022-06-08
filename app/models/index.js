const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.category = require("./category.model");
db.subcategory = require("./subcategory.model");
db.newsEN = require("./newsEN.model");
db.newsRU = require("./newsRU.model");
db.newsLV = require("./newsLV.model");
db.newsImage = require("./newsImage.model");
db.news = require("./news.model");
db.user = require("./user.model");
db.item = require("./item.model");
db.itemreview = require("./itemreview.model");
db.booking = require("./booking.model");
db.preregdetails = require("./preregdetails.model");
module.exports = db;