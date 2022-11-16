const path = require("path");
module.exports = [
  {
    name: "sendPickUpNotification",
    interval: "at 12:00pm",
    worker: {
      workerData: {
        description:
          "This job will send pick up notifications 48 hours before pickup date.",
      },
    },
  },
  {
    name: "autoCancelBooking",
    interval: "at 12:00am",
    worker: {
      workerData: {
        description: "checks and deletes expired bookings at midnight",
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
