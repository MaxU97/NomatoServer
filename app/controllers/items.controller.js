const db = require("../models");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Item = db.item;
const Booking = db.booking;
const Review = db.review;
const { checkLanguage, getTranslation } = require("../middlewares/translate");
const { getNaturalAddress } = require("../middlewares/geocoder");
const {
  parseAddressSpecific,
  getNaturalFromLongLat,
} = require("../utility/addressUtilities");
const { getDaysBetween, filterDates } = require("../utility/datesUtilities");
const i18n = require("../../locales/i18n");
exports.upload = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  const detectedLanguage = checkLanguage(req.body.description);
  let images = [];
  req.files.forEach((image) => {
    images.push(image.filename);
  });

  Promise.all([detectedLanguage]).then(async (result) => {
    const address = {
      type: "Point",
      coordinates: [req.body.addressLng, req.body.addressLat],
    };
    const newDescription = [
      { [result[0][0]["language"]]: req.body.description },
    ];
    const item = new Item({
      title: req.body.title,
      images: images,
      address: address,
      category: req.body.category,
      description: newDescription,
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
      tags = generateTags(
        item.title,
        Object.values(item.description[0])[0],
        item.category,
        item.subcat
      );
    } else {
      await item.populate("category");
      tags = generateTags(
        item.title,
        Object.values(item.description[0])[0],
        item.category,
        ""
      );
    }

    item.tagCloud = tags;
    item.save();
    console.log(req.body);
    res.status(200).send({ message: t("items.listed") });
  });
};

exports.get = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  try {
    let id = mongoose.Types.ObjectId(req.body.id);
    Item.findOne({ _id: id, status: { $nin: ["deleted"] } })
      .populate("user")
      .populate("category")
      .populate("subcat")
      .exec((err, item) => {
        if (!item) {
          res.status(404).send({ message: t("items.no-exist") });
          return;
        }
        if (item.status === "hidden") {
          if (!req.userId) {
            res.status(401).send({ message: t("items.no-exist") });
            return;
          } else {
            if (!(req.userId == item.user._id || req.isAdmin)) {
              res.status(401).send({ message: t("items.no-exist") });
              return;
            }
          }
        }
        Booking.find(
          {
            itemID: id,
            status: { $in: ["approved", "with_customer", "returned"] },
          },
          { dateStart: 1, dateEnd: 1, qtyWant: 1 }
        ).exec(async (err, bookings) => {
          let subcat;

          var bookedDates = [];
          var qtyAndBookedDates = [];
          if (bookings.length > 0) {
            bookings.forEach((booking) => {
              const dates = getDaysBetween(booking.dateStart, booking.dateEnd);
              const dateObject = dates.reduce(
                (a, v) => ({ ...a, [v]: booking.qtyWant }),
                {}
              );
              qtyAndBookedDates.push(dateObject);
            });

            var obj = {};
            qtyAndBookedDates.forEach((obj2) => {
              obj = Object.entries(obj2).reduce(
                (acc, [key, value]) =>
                  // if key is already in map1, add the values, otherwise, create new pair
                  ({ ...acc, [key]: (acc[key] || 0) + value }),
                { ...obj }
              );
            });

            bookedDates = filterDates(obj, item.itemQty);
          }

          var addNew = false;
          const translatedDescription = await getTranslation(
            item.description,
            req.headers["accept-language"]
          );

          item.description.every((value, index) => {
            if (
              Object.keys(value)[0] === Object.keys(translatedDescription)[0]
            ) {
              addNew = false;
              return false;
            } else {
              addNew = true;
              return true;
            }
          });

          if (addNew) {
            var newDesc = item.description;
            newDesc = [...newDesc, translatedDescription];
            const newTags = generateTags(
              "",
              Object.values(translatedDescription)[0],
              [],
              []
            );
            item.tagCloud = [...item.tagCloud, ...newTags];
            item.description = newDesc;
            item.save();
          }

          if (item.subcat) {
            subcat = {
              id: item.subcat._id,
              titleRU: item.subcat.titleRU,
              titleEN: item.subcat.titleEN,
              titleLV: item.subcat.titleLV,
            };
          }

          Review.find({
            itemID: mongoose.Types.ObjectId(req.body.id),
            // language: req.headers["accept-language"].toUpperCase(),
          })
            .sort({ _id: -1 })
            .limit(1)
            .populate("userID")
            .exec((err, review) => {
              var recentReview;

              if (review[0]) {
                recentReview = {
                  id: review[0].id,
                  text: review[0].text,
                  type: review[0].type,
                  username: review[0].userID.name,
                  image: review[0].userID.profileImage,
                };
              } else {
                recentReview = null;
              }

              const response = {
                item: {
                  address: {
                    lng: item.address.coordinates[0],
                    lat: item.address.coordinates[1],
                  },
                  title: item.title,
                  images: item.images,
                  category: {
                    id: item.category._id,
                    titleRU: item.category.titleRU,
                    titleEN: item.category.titleEN,
                    titleLV: item.category.titleLV,
                  },
                  subcat: subcat,
                  description: Object.values(translatedDescription)[0],
                  originalDescription: Object.values(item.description[0])[0],
                  itemQty: item.itemQty,
                  itemValue: item.itemValue,
                  minRent: item.minRent,
                  rentPriceDay: item.rentPriceDay,
                  rentPriceWeek: item.rentPriceWeek,
                  rentPriceMonth: item.rentPriceMonth,
                  likes: item.likes,
                  dislikes: item.dislikes,
                  bookedDates: bookedDates,
                  user: {
                    id: item.user._id,
                    name: item.user.name,
                    profileImage: item.user.profileImage,
                    lastActive: item.user.lastActive,
                  },
                  status: item.status,
                  recentReview: recentReview,
                },
              };

              res.status(200).send(response);
            });
        });
      })
      .catch((err) => {
        res.status(404).send(err);
      });
  } catch (err) {}
};

exports.getPopular = (req, res) => {
  Item.find(
    { status: { $nin: ["hidden", "deleted"] } },
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
          ratingAmount: 0, //TODO
          location: parseAddressSpecific(r.addressNatural, "locality"),
          imageURL: r.images[0],
          rentPriceDay: r.rentPriceDay,
        });
      });
      res.status(200).send({ items: returnArray });
    });
};

const sortType = {
  LikesAscending: "likes_asc",
  LikesDescending: "likes_desc",
  PriceAscending: "day_price_asc",
  PriceDescending: "day_price_desc",
};

exports.searchItems = (req, res) => {
  var filter = { status: { $nin: ["hidden", "deleted"] } };

  const findArray = req.body.terms
    .toUpperCase()
    .split(/[,!?. ]+/)
    .filter((element) => element);

  if (findArray.length > 0) {
    filter = {
      ...filter,
      tagCloud: {
        $in: findArray,
      },
    };
  }

  var sort = {};
  switch (req.body.sort_type) {
    case sortType.LikesAscending:
      sort = { likes: "ascending" };
      break;
    case sortType.LikesDescending:
      sort = { likes: "descending" };
      break;
    case sortType.PriceAscending:
      sort = { rentPriceDay: "ascending" };
      break;
    case sortType.PriceDescending:
      sort = { rentPriceDay: "descending" };
      break;
    default:
      sort = {};
      break;
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
    .sort(sort)
    .limit(16)
    .skip(16 * req.body.page)
    .exec((err, result) => {
      Item.count(filter).exec((err, count) => {
        let returnArray = [];
        result.forEach((r) => {
          returnArray.push({
            id: r._id,
            title: r.title,
            username: r.user.name,
            likes: r.likes,
            // ratingAmount: r.reviews.length,
            latLng: {
              lng: r.address.coordinates[0],
              lat: r.address.coordinates[1],
            },
            location: parseAddressSpecific(r.addressNatural, "locality"),
            imageURL: r.images[0],
            rentPriceDay: r.rentPriceDay,
          });
        });
        res
          .status(200)
          .send({ searchItems: returnArray, searchItemCount: count });
      });
    });
};

const generateTags = (title, description, category, subcat) => {
  tagCloud = [];

  if (title) {
    tagCloud = [...tagCloud, ...title.split(/[,!?. ]+/)];
  }

  if (category.length) {
    tagCloud = [...tagCloud, ...category.titleRU.split(/[,!?. ]+/)];
    tagCloud = [...tagCloud, ...category.titleLV.split(/[,!?. ]+/)];
    tagCloud = [...tagCloud, ...category.titleEN.split(/[,!?. ]+/)];
  }
  if (subcat.length) {
    tagCloud = [...tagCloud, ...subcat.titleRU.split(/[,!?. ]+/)];
    tagCloud = [...tagCloud, ...subcat.titleLV.split(/[,!?. ]+/)];
    tagCloud = [...tagCloud, ...subcat.titleEN.split(/[,!?. ]+/)];
  }
  if (description) {
    tagCloud = [...tagCloud, ...description.split(/[,!?. ]+/)];
  }

  tagCloud = tagCloud
    .map((element) => {
      return element.toUpperCase();
    })
    .filter((element) => element);
  return tagCloud;
};

exports.update = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  Item.findOne({ _id: mongoose.Types.ObjectId(req.body.itemId) })
    .populate("user")
    .exec((err, item) => {
      if (err) {
        res.status(400).send({ message: t("error") });
        return;
      }
      if (!item) {
        res.status(400).send({ message: t("items.no-exist") });
        return;
      }
      Booking.find({
        itemID: req.body.itemId,
        status: {
          $in: ["approval_required", "approved", "with_customer", "returned"],
        },
      }).exec((err, bookings) => {
        if (bookings.length > 0) {
          res.status(403).send({
            message: t("items.cant-edit-process"),
          });
          return;
        } else {
          if (item.user._id == req.userId || req.isAdmin) {
            const detectedLanguage = checkLanguage(req.body.description);

            let images = [];
            req.files.forEach((image) => {
              images.push(image.filename);
            });

            //saving images for delete
            const oldImages = item.images;
            Promise.all([detectedLanguage]).then(async (result) => {
              const address = {
                type: "Point",
                coordinates: [req.body.addressLng, req.body.addressLat],
              };
              item.title = req.body.title;
              item.images = images;
              item.address = address;
              item.category = req.body.category;
              item.description = [
                {
                  [result[0][0]["language"]]: req.body.description,
                },
              ];
              item.itemQty = req.body.itemQty;
              item.itemValue = req.body.itemValue;
              item.minRent = req.body.minRent;
              item.rentPriceDay = req.body.rentPriceDay;
              item.rentPriceWeek = req.body.rentPriceWeek;
              item.rentPriceMonth = req.body.rentPriceMonth;
              item.addressNatural = JSON.parse(req.body.addressNatural);

              var tags;
              if (req.body.subcat) {
                item.subcat = req.body.subcat;
                await item.populate("category");
                await item.populate("subcat");
                tags = generateTags(
                  item.title,
                  Object.values(item.description[0])[0],
                  item.category,
                  item.subcat
                );
              } else {
                await item.populate("category");
                tags = generateTags(
                  item.title,
                  Object.values(item.description[0])[0],
                  item.category,
                  ""
                );
              }

              item.tagCloud = tags;
              item.save();
              console.log(req.body);
              res.status(200).send({ message: t("items.updated") });

              oldImages.forEach((image) => {
                fs.unlink(
                  path.join(process.cwd(), "uploads", image),
                  function (err) {
                    if (err) throw err;
                    // if no error, file has been deleted successfully
                    console.log("File deleted!");
                  }
                );
              });
            });
          } else {
            res.status(401).send({ message: t("items.not-auth") });
          }
        }
      });
    });
};

exports.delete = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  Item.findOne({
    _id: mongoose.Types.ObjectId(req.body.id),
    status: { $nin: ["deleted"] },
  })
    .populate("user")
    .exec((err, item) => {
      if (err) {
        res.status(400).send({ message: t("error") });
        return;
      }
      if (!item) {
        res.status(400).send({ message: t("items.not-found-deleted") });
        return;
      }
      if (!(item.user._id == req.userId || req.isAdmin)) {
        res.status(403).send({ message: t("items.not-auth") });
        return;
      }
      Booking.find({
        itemID: req.body.id,
        status: {
          $in: ["approval_required", "approved", "with_customer"],
        },
      }).exec((err, bookings) => {
        if (bookings) {
          if (bookings.length > 0) {
            res.status(403).send({
              message: t("items.cant-delete-process"),
            });
            return;
          } else {
            item.status = "deleted";
            item.save();
            res.status(200).send({ message: t("items.deleted") });
          }
        }
      });
    });
};

exports.toggleVisibility = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  Item.findOne({
    _id: mongoose.Types.ObjectId(req.body.id),
    status: { $nin: ["deleted"] },
  })
    .populate("user")
    .exec((err, item) => {
      if (err) {
        res.status(400).send({ message: t("error") });
        return;
      }
      if (!item) {
        res.status(404).send({ message: t("items.no-exist") });
        return;
      }
      if (!(item.user._id == req.userId || req.isAdmin)) {
        res.status(403).send({ message: t("items.not-auth") });
        return;
      }
      Booking.find({
        itemID: req.body.id,
        status: {
          $in: ["approval_required", "approved", "with_customer"],
        },
      }).exec((err, bookings) => {
        if (bookings) {
          if (bookings.length > 0) {
            res.status(403).send({
              message: t("items.cant-hide-process"),
            });
            return;
          } else {
            var response;
            if (item.status == "hidden") {
              item.status = "exists";
              response = t("items.visible");
            } else {
              item.status = "hidden";
              response = t("items.hidden");
            }
            item.save();
            res.status(200).send({
              message: response,
            });
          }
        }
      });
    });
};

exports.getSelf = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  Item.find(
    {
      user: mongoose.Types.ObjectId(req.userId),
      status: { $nin: ["deleted"] },
    },
    {
      _id: 1,
      status: 1,
      title: 1,
      images: 1,
    }
  ).exec((err, items) => {
    if (err) {
      res.status(400).send({ message: t("items.error-refresh") });
      return;
    }
    if (!items) {
      res.status(401).send({ message: t("items.no-view") });
      return;
    }
    var returnArray = [];
    items.forEach((item) => {
      returnArray.push({
        id: item._id,
        status: item.status,
        title: item.title,
        image: item.images[0],
      });
    });

    res.status(200).send({ items: returnArray });
  });
};

exports.getForReview = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  Booking.findOne({
    _id: mongoose.Types.ObjectId(req.query.id),
    userID: mongoose.Types.ObjectId(req.userId),
  })
    .populate({ path: "itemID", select: { title: 1, images: 1, _id: 0 } })
    .populate({ path: "ownerID" })
    .exec((err, booking) => {
      if (err) {
        res.status(500).send({ message: t("error") });
        return;
      }
      if (!booking) {
        res.status(500).send({ message: t("items.no-booking") });
        return;
      }
      if (booking.reviewed == undefined || booking.reviewed == null) {
        res.status(500).send({ message: t("items.no-booking") });
        return;
      }

      res.status(200).send({
        title: booking.itemID.title,
        reviewed: booking.reviewed,
        image: booking.itemID.images[0],
        dateStart: booking.dateStart,
        dateEnd: booking.dateEnd,
        owner: booking.ownerID.name,
      });
      return;
    });
};

exports.submitReview = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  if (req.body.reviewType == null || req.body.reviewType == undefined) {
    res.status(500).send({ message: t("items.select-rating") });
    return;
  }
  Booking.findOne({
    _id: mongoose.Types.ObjectId(req.body.id),
    userID: mongoose.Types.ObjectId(req.userId),
  })
    .populate({ path: "itemID", select: { _id: 1, likes: 1, dislikes: 1 } })
    .exec((err, booking) => {
      if (err) {
        res.status(500).send({ message: t("error") });
        return;
      }
      if (!booking) {
        res.status(500).send({ message: t("items.no-booking") });
        return;
      }
      if (booking.reviewed == undefined || booking.reviewed == null) {
        res.status(500).send({ message: t("items.no-booking") });
        return;
      }
      if (booking.reviewed) {
        res.status(500).send({ message: t("items.reviewed") });
        return;
      }

      var review = new Review({
        userID: req.userId,
        itemID: booking.itemID._id,
        text: req.body.review,
        datePosted: Date.now(),
        type: req.body.reviewType ? "positive" : "negative",
      });

      if (req.body.reviewType) {
        booking.itemID.likes += 1;
      } else {
        booking.itemID.dislikes += 1;
      }

      booking.reviewed = true;

      booking.itemID.save();
      review.save();
      booking.save();
      res.status(200).send({ message: t("items.review-submit") });
    });
};
