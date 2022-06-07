const db = require("../models");
const mongoose = require("mongoose");
const Item = db.item;
const { checkLanguages } = require("../middlewares/translate");
const { getNaturalAddress } = require("../middlewares/geocoder");
exports.upload = (req, res) => {
  const translations = checkLanguages(
    req.body.descEN,
    req.body.descRU,
    req.body.descLV
  );
  let images = [];
  req.files.forEach((image) => {
    images.push(image.filename);
  });

  Promise.all(translations).then((result) => {
    const item = new Item({
      title: req.body.title,
      images: images,
      address: { lat: req.body.addressLat, lng: req.body.addressLng },
      category: req.body.category,
      descEN: result[0], //English
      descLV: result[1], //Russian
      descRU: result[2], //Latvian
      itemQty: req.body.itemQty,
      itemValue: req.body.itemValue,
      minRent: req.body.minRent,
      rentPriceDay: req.body.minRent,
      rentPriceWeek: req.body.minRent,
      rentPriceMonth: req.body.minRent,
      likes: 0,
      dislikes: 0,
      user: req.userId,
      reviews: [],
    });
    if (req.body.subcat) {
      item.subcat = req.body.subcat;
    }
    item.save();
    console.log(req.body);
    res.status(200).send("OK");
  });
};

exports.get = (req, res) => {
  let id;
  try {
    let id = mongoose.Types.ObjectId(req.body.id);
    Item.find({ _id: id })
      .populate("user")
      .populate("category")
      .populate("subcat")
      .exec((err, result) => {
        console.log(result);

        let subcat;
        if (result[0].subcat) {
          subcat = {
            id: result[0].subcat._id,
            titleRU: result[0].subcat.titleRU,
            titleEN: result[0].subcat.titleEN,
            titleLV: result[0].subcat.titleLV,
          };
        }
        const response = {
          item: {
            address: result[0].address,
            title: result[0].title,
            images: result[0].images,
            category: {
              id: result[0].category._id,
              titleRU: result[0].category.titleRU,
              titleEN: result[0].category.titleEN,
              titleLV: result[0].category.titleLV,
            },
            subcat: subcat,
            descEN: result[0].descEN,
            descRU: result[0].descRU,
            descLV: result[0].descLV,
            itemQty: result[0].itemQty,
            itemValue: result[0].itemValue,
            minRent: result[0].minRent,
            rentPriceDay: result[0].rentPriceDay,
            rentPriceWeek: result[0].rentPriceWeek,
            rentPriceMonth: result[0].rentPriceMonth,
            likes: result[0].likes,
            dislikes: result[0].dislikes,
            reviews: result[0].reviews,
            user: {
              id: result[0].user._id,
              name: result[0].user.name,
              profileImage: result[0].user.profileImage,
              lastActive: result[0].user.lastActive,
            },
          },
        };

        res.status(200).send(response);
      })
      .catch((err) => {
        res.status(404).send(err);
      });
  } catch (err) {}
};

exports.getPopular = (req, res) => {
  Item.find(
    {},
    {
      title: 1,
      user: 1,
      likes: 1,
      reviews: 1,
      address: 1,
      images: 1,
      rentPriceDay: 1,
    }
  )
    .populate("user")
    .sort({ likes: "descending" })
    .limit(10)
    .exec((err, result) => {
      console.log("GETS");
      let returnArray = [];
      result.forEach((r) => {
        returnArray.push({
          id: r._id,
          title: r.title,
          username: r.user.name,
          likes: r.likes,
          ratingAmount: r.reviews.length,
          location: "Riga",
          imageURL: r.images[0],
          rentPriceDay: r.rentPriceDay,
        });
      });
      res.status(200).send({ items: returnArray });
    });
};
