const db = require("../models");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Item = db.item;
const Booking = db.booking;
const { checkLanguages } = require("../middlewares/translate");
const { getNaturalAddress } = require("../middlewares/geocoder");
const {
  parseAddressSpecific,
  getNaturalFromLongLat,
} = require("../utility/addressUtilities");
const { getDaysBetween } = require("../utility/datesUtilities");
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
      tags = generateTags(item.title, result, item.category, "");
    }

    item.tagCloud = tags;
    item.save();
    console.log(req.body);
    res.status(200).send({ message: "Item has been listed" });
  });
};

exports.get = (req, res) => {
  try {
    let id = mongoose.Types.ObjectId(req.body.id);
    Item.findOne({ _id: id, status: { $nin: ["deleted"] } })
      .populate("user")
      .populate("category")
      .populate("subcat")
      .exec((err, item) => {
        if (!item) {
          res.status(404).send({ message: "Item does not exist" });
          return;
        }
        if (item.status === "hidden") {
          if (!req.userId) {
            res.status(401).send({ message: "Item does not exist" });
            return;
          } else {
            if (!(req.userId == item.user._id || req.isAdmin)) {
              res.status(401).send({ message: "Item does not exist" });
              return;
            }
          }
        }
        Booking.find(
          {
            itemID: id,
            status: { $in: ["approved", "with_customer", "returned"] },
          },
          { dateStart: 1, dateEnd: 1 }
        ).exec((err, bookings) => {
          let subcat;

          var bookedDates = [];
          if (bookings.length > 0) {
            bookings.forEach((booking) => {
              const dates = getDaysBetween(booking.dateStart, booking.dateEnd);
              bookedDates.push(...dates);
            });
          }

          if (item.subcat) {
            subcat = {
              id: item.subcat._id,
              titleRU: item.subcat.titleRU,
              titleEN: item.subcat.titleEN,
              titleLV: item.subcat.titleLV,
            };
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
              descEN: item.descEN,
              descRU: item.descRU,
              descLV: item.descLV,
              itemQty: item.itemQty,
              itemValue: item.itemValue,
              minRent: item.minRent,
              rentPriceDay: item.rentPriceDay,
              rentPriceWeek: item.rentPriceWeek,
              rentPriceMonth: item.rentPriceMonth,
              likes: item.likes,
              dislikes: item.dislikes,
              reviews: item.reviews,
              bookedDates: bookedDates,
              user: {
                id: item.user._id,
                name: item.user.name,
                profileImage: item.user.profileImage,
                lastActive: item.user.lastActive,
              },
              status: item.status,
            },
          };

          res.status(200).send(response);
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
  if (subcat) {
    tagCloud = [...tagCloud, ...subcat.titleRU.split(/[,!?. ]+/)];
    tagCloud = [...tagCloud, ...subcat.titleLV.split(/[,!?. ]+/)];
    tagCloud = [...tagCloud, ...subcat.titleEN.split(/[,!?. ]+/)];
  }

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

exports.update = (req, res) => {
  Item.findOne({ _id: mongoose.Types.ObjectId(req.body.itemId) })
    .populate("user")
    .exec((err, item) => {
      if (err) {
        res.status(400).send({ message: "Something went wrong" });
        return;
      }
      if (!item) {
        res.status(400).send({ message: "item not found" });
        return;
      }
      Booking.find({
        itemID: req.body.itemId,
        status: {
          $in: ["approval_required", "approved", "with_customer", "returned"],
        },
      }).exec((err, bookings) => {
        if (bookings) {
          if (bookings.length > 0) {
            res.status(403).send({
              message:
                "Items cannot be edited if there are any bookings waiting for approval, or they have been rented before",
            });
            return;
          }
        } else {
          if (item.user._id == req.userId || req.isAdmin) {
            const translations = checkLanguages(
              req.body.descEN,
              req.body.descRU,
              req.body.descLV
            );
            let images = [];
            req.files.forEach((image) => {
              images.push(image.filename);
            });

            //saving images for delete
            const oldImages = item.images;
            Promise.all(translations).then(async (result) => {
              const address = {
                type: "Point",
                coordinates: [req.body.addressLng, req.body.addressLat],
              };
              item.title = req.body.title;
              item.images = images;
              item.address = address;
              item.category = req.body.category;
              item.descEN = result[0]; //English
              item.descLV = result[1]; //Russian
              item.descRU = result[2]; //Latvian
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
                  result,
                  item.category,
                  item.subcat
                );
              } else {
                await item.populate("category");
                tags = generateTags(item.title, result, item.category, "");
              }

              item.tagCloud = tags;
              item.save();
              console.log(req.body);
              res.status(200).send({ message: "Item has been updated" });

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
            res
              .status(401)
              .send({ message: "You are not authorised to do this" });
          }
        }
      });
    });
};

exports.delete = (req, res) => {
  Item.findOne({
    _id: mongoose.Types.ObjectId(req.body.id),
    status: { $nin: ["deleted"] },
  })
    .populate("user")
    .exec((err, item) => {
      if (err) {
        res.status(400).send({ message: "Something went wrong" });
        return;
      }
      if (!item) {
        res.status(400).send({ message: "Item not found or already deleted" });
        return;
      }
      if (!(item.user._id == req.userId || req.isAdmin)) {
        res.status(403).send({ message: "Not Authorized" });
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
              message:
                "Items cannot be deleted if there are any bookings waiting for approval, or any active rentals",
            });
            return;
          } else {
            item.status = "deleted";
            item.save();
            res.status(200).send({ message: "Item has been deleted" });
          }
        }
      });
    });
};

exports.toggleVisibility = (req, res) => {
  Item.findOne({
    _id: mongoose.Types.ObjectId(req.body.id),
    status: { $nin: ["deleted"] },
  })
    .populate("user")
    .exec((err, item) => {
      if (err) {
        res.status(400).send({ message: "Something went wrong" });
        return;
      }
      if (!item) {
        res.status(404).send({ message: "Item not found" });
        return;
      }
      if (!(item.user._id == req.userId || req.isAdmin)) {
        res.status(403).send({ message: "Not Authorized" });
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
              message:
                "Items cannot be hidden if there are any bookings waiting for approval or are currently being rented",
            });
            return;
          } else {
            var response;
            if (item.status == "hidden") {
              item.status = "exists";
              response = "Item is now visible";
            } else {
              item.status = "hidden";
              response = "Item is now hidden";
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
  Item.find(
    {
      user: mongoose.Types.ObjectId(req.userId),
      status: { $nin: ["deleted"] },
    },
    {
      status: 1,
      title: 1,
      images: 1,
    }
  ).exec((err, items) => {
    if (err) {
      res
        .status(400)
        .send({ message: "Something went wrong, please refresh the page" });
      return;
    }
    if (!items) {
      res.status(401).send({ message: "Not allowed to view" });
      return;
    }
    var returnArray = [];
    items.forEach((item) => {
      returnArray.push({
        status: item.status,
        title: item.status,
        image: item.images[0],
      });
    });

    res.status(200).send({ items: returnArray });
  });
};
