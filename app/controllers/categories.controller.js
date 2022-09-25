const db = require("../models");
const Category = db.category;
const SubCategory = db.subcategory;
const Item = db.item;
const mongoose = require("mongoose");
const { objectIdSymbol } = require("mongoose/lib/helpers/symbols");
const { item } = require("../models");
const path = require("path");
const fs = require("fs");
exports.getCategories = (req, res) => {
  Category.find()
    .populate("subcats")
    .then((results) => {
      res.status(200).send(results);
    });
};

const getSubcategories = async (subcats) => {
  var promises = [];
  var subPromises = [];
  subcats.map((sub) => {
    if ("_id" in sub) {
      //update existing subcategory

      SubCategory.findOne({
        _id: mongoose.Types.ObjectId(sub._id),
      }).exec((err, subcat) => {
        subcat.titleRU = sub.titleRU;
        subcat.titleEN = sub.titleEN;
        subcat.titleLV = sub.titleLV;
        subcat.save();
      });
    } else {
      const subcat = new SubCategory({
        titleRU: sub.titleRU,
        titleLV: sub.titleLV,
        titleEN: sub.titleEN,
      });
      promises.push(subcat.save());
    }
  });
  return promises;
};

exports.createCategory = async (req, res) => {
  try {
    const category = req.body;

    if ("_id" in category) {
      //editing existing category

      category.subcats = JSON.parse(category.subcats);
      const promises = await getSubcategories(category.subcats);

      Promise.all(promises).then((results) => {
        let subcatIDs = [];
        results.map((r) => {
          subcatIDs.push(r.id);
        });
        Category.findOne({ _id: mongoose.Types.ObjectId(category._id) }).exec(
          async (err, cat) => {
            if ("file" in req) {
              fs.unlink(
                path.join(process.cwd(), "uploads", cat.imageURL),
                function (err) {
                  if (err) throw err;
                  console.log("File deleted!");
                }
              );
              cat.imageURL = "CategoryIcons/" + req.file.filename;
            }
            cat.titleRU = category.titleRU;
            cat.titleEN = category.titleEN;
            cat.titleLV = category.titleLV;

            let newSubcats = [...subcatIDs];
            Object.values(cat.subcats).forEach((sub) => {
              newSubcats.push(sub.toString());
            });
            if ("deletedSubcats" in category) {
              category.deletedSubcats = JSON.parse(category.deletedSubcats);

              await SubCategory.deleteMany({
                _id: { $in: category.deletedSubcats },
              });
              newSubcats.map((sub, index) => {
                if (category.deletedSubcats.includes(sub)) {
                  newSubcats.splice(index, 1);
                }
              });
            }

            cat.subcats = newSubcats;

            cat.save();
            res.status(200).send("All Correct");
          }
        );
      });
    } else {
      if (!req.file) {
        res.status(500).send({ message: "Please attach an image" });
        return;
      }
      //adding new one
      category.subcats = JSON.parse(category.subcats);
      var promises = [];
      category.subcats.map((sub) => {
        const subcat = new SubCategory({
          titleRU: sub.titleRU,
          titleLV: sub.titleLV,
          titleEN: sub.titleEN,
        });
        promises.push(subcat.save());
      });

      Promise.all(promises).then((results) => {
        let subcatIDs = [];
        results.map((r) => {
          subcatIDs.push(r.id);
        });
        const cat = new Category({
          imageURL: "CategoryIcons/" + req.file.filename,
          titleRU: category.titleRU,
          titleLV: category.titleLV,
          titleEN: category.titleEN,
          subcats: subcatIDs,
        });
        cat.save();
        Category.find()
          .populate("subcats")
          .then((results) => {
            res.status(200).send(results);
          });
      });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

exports.checkExisting = async (req, res) => {
  let promises = [];

  promises.push(
    Category.findOne({
      titleRU: req.body["titleRU"],
    })
  );
  promises.push(
    Category.findOne({
      titleEN: req.body["titleEN"],
    })
  );
  promises.push(
    Category.findOne({
      titleLV: req.body["titleLV"],
    })
  );

  Promise.all(promises).then((results) => {
    let exists = false;
    results.every((result) => {
      if (result) {
        exists = true;
        return false;
      } else {
        return true;
      }
    });
    if (exists) {
      res.status(400).send({ message: "Exists" });
    } else {
      res.status(200).send({ message: "Available" });
    }
  });
};

exports.deleteCategory = (req, res) => {
  Category.deleteOne({ _id: mongoose.Types.ObjectId(req.body._id) }).exec(
    (err, del) => {
      if (err) {
        res.status(500).send({ message: "Something Went Wrong" });
        return;
      }
      Category.find()
        .populate("subcats")
        .then((results) => {
          res.status(200).send(results);
        });
    }
  );
};

exports.checkCategoryDependancies = (req, res) => {
  Item.findOne({ category: mongoose.Types.ObjectId(req.body._id) }).exec(
    (err, item) => {
      if (item) {
        res.status(200).send({ message: "Dependancies Exist" });
      } else {
        res.status(404).send({ message: "No dependancies" });
      }
    }
  );
};
