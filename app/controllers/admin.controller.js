const config = require("../config/auth.config");
const db = require("../models");
const mongoose = require("mongoose");
const i18n = require("../../locales/i18n");
const sendPardonEmail = require("../services/scheduler/jobs/sendPardonEmail");
const sendBanEmail = require("../services/scheduler/jobs/sendBanEmail");
const sendWarnEmail = require("../services/scheduler/jobs/sendWarnEmail");
const News = db.news;
const User = db.user;
const Booking = db.booking;

exports.ban = async (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findById(mongoose.Types.ObjectId(req.body.id)).exec((err, user) => {
    if (err) {
      res.status(400).send({ message: t("error") });
      return;
    }
    if (!user) {
      res.status(400).send({ message: t("auth.user-not-found") });
      return;
    }
    banUser(user, req.body.reason);
    res.status(200).send({
      message: user.suspended ? t("auth.user-banned") : t("auth.user-pardoned"),
    });
  });
};

exports.warn = async (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findById(mongoose.Types.ObjectId(req.body.id)).exec((err, user) => {
    if (err) {
      res.status(400).send({ message: t("error") });
      return;
    }
    if (!user) {
      res.status(400).send({ message: t("auth.user-not-found") });
      return;
    }
    if (user.suspended) {
      res.status(400).send({ message: t("auth.ban-warn") });
      return;
    }

    user.warnings += 1;
    if (user.warnings >= 3 && !user.suspended) {
      banUser(user, req.body.reason);
    } else {
      sendWarnEmail(user.email, req.body.reason, user.warnings);
      user.save();
    }

    res.status(200).send({
      message: user.suspended ? t("auth.user-banned") : t("auth.user-warned"),
    });
  });
};

exports.removeWarnings = async (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findById(mongoose.Types.ObjectId(req.body.id)).exec((err, user) => {
    if (err) {
      res.status(400).send({ message: t("error") });
      return;
    }
    if (!user) {
      res.status(400).send({ message: t("auth.user-not-found") });
      return;
    }

    if (parseInt(req.body.count) > user.warnings) {
      res.status(400).send({ message: t("auth.cant-remove-more-warnings") });
      return;
    } else {
      user.warnings -= parseInt(req.body.count);
      user.save();
    }

    res.status(200).send({
      message: t("auth.warnings-removed"),
    });
  });
};

exports.toggleAdmin = async (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  User.findById(mongoose.Types.ObjectId(req.body.id)).exec((err, user) => {
    if (err) {
      res.status(400).send({ message: t("error") });
      return;
    }
    if (!user) {
      res.status(400).send({ message: t("auth.user-not-found") });
      return;
    }

    user.admin = !user.admin;
    user.save();

    res.status(200).send({
      message: user.admin ? t("auth.user-is-admin") : t("auth.user-not-admin"),
    });
  });
};

exports.getUserRequests = async (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  Booking.find({
    ownerID: mongoose.Types.ObjectId(req.query.id),
  })
    .populate({
      path: "itemID",
      select: { _id: 1, title: 1, images: 1 },
    })
    .populate({ path: "extras" })
    .sort({ created: -1 })
    .populate({
      path: "userID",
      select: { _id: 1, name: 1, surname: 1, profileImage: 1 },
    })
    .exec(async (err, bookings) => {
      if (err) {
        res.status(404).send({ error: t("error") });
      }

      var bookingsToReturn = await Promise.all(
        bookings.map(async (item, index) => {
          if (item.extras.length) {
            var extrasToReturn = await Promise.all(
              item.extras.map(async (extra, index) => {
                var extraTitle;
                var extraDescription;

                extra.title.every((value, index) => {
                  if (value[req.headers["accept-language"]]) {
                    extraTitle = value[req.headers["accept-language"]];
                    return false;
                  }
                  return true;
                });

                extra.description.every((value, index) => {
                  if (value[req.headers["accept-language"]]) {
                    extraDescription = value[req.headers["accept-language"]];
                    return false;
                  }
                  return true;
                });
                return {
                  id: extra.id,
                  title: extraTitle
                    ? extraTitle
                    : Object.values(extra.title[0])[0],
                  price: extra.price,
                  description: extraDescription
                    ? extraDescription
                    : Object.values(extra.description[0])[0],
                };
              })
            );

            return {
              itemID: item.itemID,
              userID: item.userID,
              comment: item.comment,
              created: item.created,
              dateEnd: item.dateEnd,
              dateStart: item.dateStart,
              extras: extrasToReturn,
              intentID: item.intentID,
              qtyWant: item.qtyWant,
              status: item.status,
              _id: item._id,
            };
          } else {
            return {
              itemID: item.itemID,
              userID: item.userID,
              comment: item.comment,
              created: item.created,
              dateEnd: item.dateEnd,
              dateStart: item.dateStart,
              extras: undefined,
              intentID: item.intentID,
              qtyWant: item.qtyWant,
              status: item.status,
              _id: item._id,
            };
          }
        })
      );

      res.send({ bookingRequests: bookingsToReturn });
    });
};

const banUser = (user, reason) => {
  user.suspended = !user.suspended;
  user.save();
  if (user.suspended) {
    sendBanEmail(user.email, reason);
  } else {
    sendPardonEmail(user.email);
  }
};

exports.getUserBookings = async (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );
  Booking.find({
    userID: mongoose.Types.ObjectId(req.query.id),
  })
    .populate({
      path: "itemID",
      select: { _id: 1, title: 1, images: 1 },
    })
    .populate({ path: "extras" })
    .sort({ created: -1 })
    .populate({
      path: "ownerID",
      select: { _id: 1, name: 1, surname: 1, profileImage: 1 },
    })
    .exec(async (err, bookings) => {
      if (err) {
        res.status(404).send({ error: t("error") });
      }

      var bookingsToReturn = await Promise.all(
        bookings.map(async (item, index) => {
          if (item.extras.length) {
            var extrasToReturn = await Promise.all(
              item.extras.map(async (extra, index) => {
                var extraTitle;
                var extraDescription;

                extra.title.every((value, index) => {
                  if (value[req.headers["accept-language"]]) {
                    extraTitle = value[req.headers["accept-language"]];
                    return false;
                  }
                  return true;
                });

                extra.description.every((value, index) => {
                  if (value[req.headers["accept-language"]]) {
                    extraDescription = value[req.headers["accept-language"]];
                    return false;
                  }
                  return true;
                });
                return {
                  id: extra.id,
                  title: extraTitle
                    ? extraTitle
                    : Object.values(extra.title[0])[0],
                  price: extra.price,
                  description: extraDescription
                    ? extraDescription
                    : Object.values(extra.description[0])[0],
                };
              })
            );

            return {
              itemID: item.itemID,
              ownerID: item.ownerID,
              comment: item.comment,
              created: item.created,
              dateEnd: item.dateEnd,
              dateStart: item.dateStart,
              extras: extrasToReturn,
              intentID: item.intentID,
              qtyWant: item.qtyWant,
              status: item.status,
              _id: item._id,
            };
          } else {
            return {
              itemID: item.itemID,
              ownerID: item.userID,
              comment: item.comment,
              created: item.created,
              dateEnd: item.dateEnd,
              dateStart: item.dateStart,
              extras: undefined,
              intentID: item.intentID,
              qtyWant: item.qtyWant,
              status: item.status,
              _id: item._id,
            };
          }
        })
      );

      res.send({ bookings: bookingsToReturn });
    });
};

exports.getUserList = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );

  var searchFilter = {};

  if (req.query.searchTerm) {
    searchFilter = {
      $or: [
        { name: { $regex: req.query.searchTerm } },
        { surname: { $regex: req.query.searchTerm } },
        { email: { $regex: req.query.searchTerm } },
      ],
    };
  }

  User.find(searchFilter, {
    _id: 1,
    name: 1,
    email: 1,
    surname: 1,
    profileImage: 1,
  })

    .limit(12 + parseInt(req.query.step))
    .exec(async (err, users) => {
      if (err) {
        res.status(404).send({ error: t("error") });
      }
      User.count(searchFilter).exec((err, count) => {
        res.send({ users: users, totalCount: count });
      });
    });
};

exports.getNewsList = (req, res) => {
  const t = i18n(
    req.headers["accept-language"] ? req.headers["accept-language"] : "en"
  );

  var searchFilter = { deleted: { $ne: true } };

  if (req.query.searchTerm) {
    searchFilter = {
      ...searchFilter,
      $or: [{ title: { $regex: req.query.searchTerm } }],
    };
  }

  News.find(searchFilter, {
    _id: 1,
    title: 1,
    image: 1,
    dateAdded: 1,
  })
    .limit(6 + parseInt(req.query.step))
    .exec(async (err, news) => {
      if (err) {
        res.status(404).send({ error: t("error") });
      }
      News.count(searchFilter).exec((err, count) => {
        res.send({ news: news, totalCount: count });
      });
    });
};
