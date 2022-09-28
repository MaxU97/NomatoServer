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
  {
    name: "autoCancelBooking",
    interval: "every 10 seconds",
    worker: {
      workerData: {
        description: "checks and deletes expired bookings for owners",
      },
    },
  },
  {
    name: "autoCancelApprovedBooking",
    interval: "at 12:00am",
    worker: {
      workerData: {
        description:
          "checks and deletes approved bookings that weren't picked up on the day",
      },
    },
  },
];
