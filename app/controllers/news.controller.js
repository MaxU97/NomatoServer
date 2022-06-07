const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const News = db.news;
const NewsEN = db.newsEN;
const NewsRU = db.newsRU;
const NewsLV = db.newsLV;
const NewsImage = db.newsImage;
const { ObjectId } = require("mongodb");
const i18n = require("../../locales/i18n");
const getDiscriminatorByValue = require("mongoose/lib/helpers/discriminator/getDiscriminatorByValue");

exports.upload = (req, res) => {
  const news = new News({
    userID: mongoose.Types.ObjectId(req.userId),
    dateAdded: Date.now(),
  });
  news.save((err, news) => {
    if (err) {
      res.status(500).send({ message: err + "NewsError" });
      return;
    }

    ///Check if english news was typed in
    if (req.body.titleEN) {
      const newsEN = new NewsEN({
        newsID: news._id,
        title: req.body.titleEN,
        short_text: req.body.short_textEN,
        text: req.body.textEN,
      });
      newsEN.save((err) => {
        if (err) {
          res.status(500).send({ message: err + "NewsENError" });
          return;
        }
      });
    }

    ///Check if russian news was typed in
    if (req.body.titleRU) {
      const newsRU = new NewsRU({
        newsID: news._id,
        title: req.body.titleRU,
        short_text: req.body.short_textRU,
        text: req.body.textRU,
      });
      newsRU.save((err) => {
        if (err) {
          res.status(500).send({ message: err + "NewsRUError" });
          return;
        }
      });
    }

    ///Check if latvian news was typed in
    if (req.body.titleLV) {
      const newsLV = new NewsLV({
        newsID: news._id,
        title: req.body.titleLV,
        short_text: req.body.short_textLV,
        text: req.body.textLV,
      });
      newsLV.save((err) => {
        if (err) {
          res.status(500).send({ message: err + "NewsLVError" });
          return;
        }
      });
    }
    for (let i = 0; i < req.files.length; i++) {
      const newsImage = new NewsImage({
        newsID: news._id,
        imageURL: req.files[i].filename,
        main: i === parseInt(req.body.mainImageIndex) ? true : false,
      });
      newsImage.save((err) => {
        if (err) {
          res.status(500).send({ message: err + "NewsImageError" });
          return;
        }
      });
    }
    res.status(200).send({ message: "News Uploaded" });
  });
};

exports.getNews = (req, res) => {
  const language = req.headers["accept-language"];
  let langModel;
  switch (language) {
    case "en":
      langModel = NewsEN;
    case "lv":
      langModel = NewsLV;
    case "ru":
      langModel = NewsRU;
    default:
      langModel = NewsEN;
  }
  News.find({ deleted: false }, { deleted: 0 })
    .sort({ dateAdded: "desc" })
    .limit(req.query.amount)
    .exec((err, doc) => {
      let ids = [];
      doc.forEach((news) => {
        ids.push(news._id);
      });
      NewsImage.find(
        { newsID: { $in: ids }, main: true },
        { imageURL: 1, newsID: 1, _id: 0 }
      ).exec((err, images) => {
        {
          langModel
            .find(
              { newsID: { $in: ids } },
              { newsID: 1, title: 1, short_text: 1 }
            )
            .exec((err, body) => {
              res.status(200).send({
                body,
                images,
                doc,
              });
            });
        }
      });
    });
};
// Promise.all([news]).then((newsData) => {
//   newsData.forEach((item) => {
//     const images = NewsImage.find(
//       { newsID: item.id },
//       { imageURL: 1, main: 1 }
//     );
//     const body = langModel.find(
//       { newsID: item.id },
//       { title: 1, short_text: 1, text: 1 }
//     );
//     Promise.all([images, body]).then((data) => {
//       console.log(data);
//     });
// returnObject = {
//   newsID: item.id,
//   images: images,
//   title: body.title,
//   shortText: body.short_text,
//   text: body.text,
// };
// returnArray = [...returnArray, returnObject];

exports.getNewsSpecific = (req, res) => {};

// switch (language) {
//   case "en":
//     NewsEN.find({ newsID: item._id }).exec((err, body) => {
//       toReturn = {
//         newsID: item._id,
//         title: body.title,
//         shortText: body.title,
//         text: body.text,
//         images: images,
//       };
//     });
//   case "lv":
//     NewsLV.find({ newsID: item._id }).exec((err, body) => {
//       toReturn = {
//         newsID: item._id,
//         title: body.title,
//         shortText: body.title,
//         text: body.text,
//         images: images,
//       };
//     });
//   case "ru":
//     NewsRU.find({ newsID: item._id }).exec((err, body) => {
//       toReturn = {
//         newsID: item._id,
//         title: body.title,
//         shortText: body.title,
//         text: body.text,
//         images: images,
//       };
//     });
// }
