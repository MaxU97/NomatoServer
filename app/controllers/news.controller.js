const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const User = db.user;
const News = db.news;
const NewsImage = db.newsImage;
const fs = require("fs");
const { ObjectId } = require("mongodb");
const i18n = require("../../locales/i18n");
const getDiscriminatorByValue = require("mongoose/lib/helpers/discriminator/getDiscriminatorByValue");
const path = require("path");

exports.upload = (req, res) => {
  const news = new News({
    userID: mongoose.Types.ObjectId(req.userId),
    dateAdded: Date.now(),
    body: req.body.text,
    title: req.body.title,
    image: req.files[0].filename,
    language: req.body.language.toUpperCase(),
  });
  news.save((err, news) => {
    if (err) {
      res.status(500).send({ message: err + "News Error" });
      return;
    }

    res.status(200).send({ message: "News Uploaded" });
  });
};

exports.update = (req, res) => {
  if (req.body.id) {
    News.findOne({
      deleted: false,
      _id: mongoose.Types.ObjectId(req.body.id),
    }).exec((err, doc) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      var changed = false;

      if (req.body.language !== doc.language) {
        doc.language = req.body.language;
        changed = true;
      }

      if (req.body.title !== doc.title) {
        doc.title = req.body.title;
        changed = true;
      }

      if (req.body.text !== doc.body) {
        doc.body = req.body.text;
        changed = true;
      }

      if (req.files.length) {
        fs.unlink(
          path.join(process.cwd(), "uploads/NewsImages", doc.image),
          function (err) {
            if (err) throw err;
            console.log("File deleted!");
          }
        );
        doc.image = req.files[0].filename;
        changed = true;
      }

      if (changed) {
        doc.save();
        res.status(200).send({ message: "News Updated" });
      } else {
        res.status(400).send({ message: "Nothing Was Changed" });
      }
    });
  } else {
    res.status(404).send({ message: "Not Found" });
  }
};

exports.delete = (req, res) => {
  if (req.body.id) {
    News.findOne({
      deleted: false,
      _id: mongoose.Types.ObjectId(req.body.id),
    }).exec((err, doc) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      doc.deleted = true;
      doc.save();
      res.status(200).send({ message: "News Deleted" });
      return;
    });
  } else {
    res.status(404).send({ message: "Not Found" });
  }
};

exports.getNews = (req, res) => {
  const language = req.headers["accept-language"];
  News.find(
    { deleted: false, hidden: false, language: language.toUpperCase() },
    { deleted: 0, userID: 0, language: 0 }
  )
    .sort({ dateAdded: "desc" })
    .limit(parseInt(req.query.amount))
    .exec((err, doc) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      res.status(200).send(doc);
    });
};

exports.get = (req, res) => {
  if (req.query.id) {
    News.findOne(
      { deleted: false, _id: mongoose.Types.ObjectId(req.query.id) },
      { deleted: 0, userID: 0, _id: 0 }
    ).exec((err, doc) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      res.status(200).send(doc);
    });
  } else {
    res.status(404).send({ message: "Not Found" });
  }
};

exports.toggleVisibility = (req, res) => {
  if (req.body.id) {
    News.findOne({
      deleted: false,
      _id: mongoose.Types.ObjectId(req.body.id),
    }).exec((err, doc) => {
      if (err) {
        res.status(500).send({ message: "Something went wrong" });
        return;
      }
      doc.hidden = !doc.hidden;
      doc.save();
      res
        .status(200)
        .send({ message: doc.hidden ? "News Hidden" : "News Showing" });
      return;
    });
  } else {
    res.status(404).send({ message: "Not Found" });
  }
};
