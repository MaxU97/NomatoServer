const path = require("path");
module.exports = [
  {
    name: "sendPickUpNotification",
    timeout: "at 12pm",
    worker: {
      workerData: {
        description:
          "This job will send pick up notifications 48 hours before pickup date.",
      },
    },
  },
];
