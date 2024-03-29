const express = require("express");
const cors = require("cors");
const app = express();
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const https = require("https");

var corsOptions = {
  origin: [process.env.corsOrigin, process.env.corsOriginApi],
};

app.use(cors(corsOptions));
app.use("/api/webhooks/stripe", express.raw({ type: "*/*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("uploads"));
app.use("/public", express.static(path.resolve(__dirname, "public")));

app.use(express.static(path.join(__dirname, "build")));

const multer = require("multer");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    file_name = file.originalname;
    file_name = file_name.replace(/\s+/g, "");
    cb(null, req.userId + file_name + Date.now() + ".webp");
  },
});

var iconStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/CategoryIcons");
  },
  filename: function (req, file, cb) {
    file_name = file.originalname;
    file_name = file_name.replace(/\s+/g, "");
    cb(null, req.userId + file_name + Date.now() + ".svg");
  },
});

var profilePictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/ProfilePictures");
  },
  filename: function (req, file, cb) {
    file_name = file.originalname;
    file_name = file_name.replace(/\s+/g, "");
    cb(null, req.userId + file_name + Date.now() + ".webp");
  },
});

var newsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/NewsImages");
  },
  filename: function (req, file, cb) {
    file_name = file.originalname;
    file_name = file_name.replace(/\s+/g, "");
    cb(null, req.userId + file_name + Date.now() + ".webp");
  },
});

const upload = multer({ storage: storage });

const uploadIcon = multer({ storage: iconStorage });

const uploadProfilePicture = multer({ storage: profilePictureStorage });

const uploadNews = multer({ storage: newsStorage });

const db = require("./app/models");

db.mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

require("./app/routes/auth.routes")(app, uploadProfilePicture);
require("./app/routes/booking.routes")(app);
require("./app/routes/profile.routes")(app, upload);
require("./app/routes/news.routes")(app, uploadNews);
require("./app/routes/items.routes")(app, upload);
require("./app/routes/categories.routes")(app, uploadIcon);
require("./app/routes/finance.routes")(app);
require("./app/routes/review.routes")(app);
require("./app/routes/webhook.routes")(app);
require("./app/routes/utility.routes")(app);
require("./app/routes/admin.routes")(app);
require("./app/services/scheduler/taskScheduler")();

const PORT = process.env.PORT || 4000;
console.log("yes");

if (process.env.MODE == "DEBUG") {
  https
    .createServer(
      {
        key: fs.readFileSync("./certification/cert.key"),
        cert: fs.readFileSync("./certification/cert.crt"),
      },
      app
    )
    .listen(PORT, () => {
      console.log(`Server is running on port ${PORT}.`);
    });
} else {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
  });
}
