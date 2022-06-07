const Bree = require("bree");
const jobs = require("./jobs");
const Graceful = require("@ladjs/graceful");
const Cabin = require("cabin");
const path = require("path");

module.exports = () => {
  const bree = new Bree({
    logger: new Cabin(),
    root: path.join(__dirname + "/jobs"),
    jobs: jobs,
  });
  const graceful = new Graceful({ brees: [bree] });
  graceful.listen();
  bree.start();
};
