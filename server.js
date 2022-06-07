const express = require("express");
const cors = require("cors");
const util = require("util");
const app = express();
const dbConfig = require("./app/config/db.config");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();
const path = require("path");
const https = require("https");

var corsOptions = {
  origin: "https://localhost:3000",
};

app.use(cors(corsOptions));
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

const upload = multer({ storage: storage });

const uploadIcon = multer({ storage: iconStorage });

const db = require("./app/models");

db.mongoose
  .connect(
    `mongodb+srv://nomato_dev:cd2605bb4@nomatodev.lghiyns.mongodb.net/test`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Successfully connect to MongoDB.");
  })
  .catch((err) => {
    console.error("Connection error", err);
    process.exit();
  });

require("./app/routes/auth.routes")(app);
require("./app/routes/booking.routes")(app);
require("./app/routes/profile.routes")(app, upload);
require("./app/routes/news.routes")(app, upload);
require("./app/routes/items.routes")(app, upload);
require("./app/routes/categories.routes")(app, uploadIcon);
require("./app/services/scheduler/taskScheduler")();
app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});
const PORT = process.env.PORT || 4000;

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
