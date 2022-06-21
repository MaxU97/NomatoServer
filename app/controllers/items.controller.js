const db = require("../models");
const mongoose = require("mongoose");
const Item = db.item;
const Booking = db.booking;
const { checkLanguages } = require("../middlewares/translate");
const { getNaturalAddress } = require("../middlewares/geocoder");
const {
  parseAddressSpecific,
  getNaturalFromLongLat,
} = require("../utility/addressUtilities");
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

  Promise.all(translations).then(async (result) => {
    const address = {
      type: "Point",
      coordinates: [req.body.addressLng, req.body.addressLat],
    };
    const item = new Item({
      title: req.body.title,
      images: images,
      address: address,
      category: req.body.category,
      descEN: result[0], //English
      descLV: result[1], //Russian
      descRU: result[2], //Latvian
      itemQty: req.body.itemQty,
      itemValue: req.body.itemValue,
      minRent: req.body.minRent,
      rentPriceDay: req.body.rentPriceDay,
      rentPriceWeek: req.body.rentPriceWeek,
      rentPriceMonth: req.body.rentPriceMonth,
      likes: 0,
      dislikes: 0,
      user: req.userId,
      reviews: [],
      addressNatural: JSON.parse(req.body.addressNatural),
    });

    var tags;
    if (req.body.subcat) {
      item.subcat = req.body.subcat;
      await item.populate("category");
      await item.populate("subcat");
      tags = generateTags(item.title, result, item.category, item.subcat);
    } else {
      await item.populate("category");
      tags = generateTags(item.title, result, item.category, []);
    }

    item.tagCloud = tags;
    item.save();
    console.log(req.body);
    res.status(200).send({ message: "Item has been listed" });
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
        Booking.find({
          itemID: id,
          status: { $in: ["approved", "with_customer"] },
        }).exec;
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
            address: {
              lng: result[0].address.coordinates[0],
              lat: result[0].address.coordinates[1],
            },
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
      addressNatural: 1,
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
          location: parseAddressSpecific(r.addressNatural, "locality"),
          imageURL: r.images[0],
          rentPriceDay: r.rentPriceDay,
        });
      });
      res.status(200).send({ items: returnArray });
    });
};

exports.searchItems = (req, res) => {
  var filter;
  const findArray = req.body.terms
    .toUpperCase()
    .split(/[,!?. ]+/)
    .filter((element) => element);

  if (findArray.length > 0) {
    filter = {
      tagCloud: {
        $in: findArray,
      },
    };
  } else {
    filter = {};
  }

  if (req.body.category) {
    filter = {
      ...filter,
      category: mongoose.Types.ObjectId(req.body.category),
    };
  }

  if (req.body.lat & req.body.lng) {
    const geometry = {
      type: "Point",
      coordinates: [req.body.lng, req.body.lat],
    };
    filter = {
      ...filter,
      address: {
        $nearSphere: {
          $geometry: geometry,
          $maxDistance: req.body.km ? req.body.km : 10000,
        },
      },
    };
  }

  var priceFilter = {};

  if (req.body.pricefrom) {
    priceFilter = { $gte: req.body.pricefrom };
  }

  if (req.body.priceto) {
    priceFilter = { ...priceFilter, $lte: req.body.priceto };
  }

  if (Object.keys(priceFilter).length > 0) {
    filter = {
      ...filter,
      rentPriceDay: priceFilter,
    };
  }

  Item.find(filter, {
    title: 1,
    user: 1,
    likes: 1,
    reviews: 1,
    address: 1,
    addressNatural: 1,
    images: 1,
    rentPriceDay: 1,
  })
    .populate("user")
    .limit(16)
    .skip(16 * req.body.page)
    .exec((err, result) => {
      Item.count().exec((err, count) => {
        let returnArray = [];
        result.forEach((r) => {
          returnArray.push({
            id: r._id,
            title: r.title,
            username: r.user.name,
            likes: r.likes,
            ratingAmount: r.reviews.length,
            latLng: {
              lng: r.address.coordinates[0],
              lat: r.address.coordinates[1],
            },
            location: parseAddressSpecific(r.addressNatural, "locality"),
            imageURL: r.images[0],
            rentPriceDay: r.rentPriceDay,
          });
        });
        if (result.length < 16) {
          count = result.length;
        }
        res
          .status(200)
          .send({ searchItems: returnArray, searchItemCount: count });
      });
    });
};

const generateTags = (title, result, category, subcat) => {
  tagCloud = [];

  tagCloud = [...tagCloud, ...title.split(/[,!?. ]+/)];

  tagCloud = [...tagCloud, ...category.titleRU.split(/[,!?. ]+/)];
  tagCloud = [...tagCloud, ...category.titleLV.split(/[,!?. ]+/)];
  tagCloud = [...tagCloud, ...category.titleEN.split(/[,!?. ]+/)];
  tagCloud = [...tagCloud, ...subcat.titleRU.split(/[,!?. ]+/)];
  tagCloud = [...tagCloud, ...subcat.titleLV.split(/[,!?. ]+/)];
  tagCloud = [...tagCloud, ...subcat.titleEN.split(/[,!?. ]+/)];

  result.map((res) => {
    tagCloud = [...tagCloud, ...res.split(/[,!?. ]+/)];
  });
  tagCloud = tagCloud
    .map((element) => {
      return element.toUpperCase();
    })
    .filter((element) => element);
  return tagCloud;
};
