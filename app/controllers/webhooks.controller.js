const stripe = require("stripe");
const fs = require("fs");
const path = require("path");
const sendBankErrorNotification = require("../services/scheduler/jobs/sendBankErrorNotification");
const sendPayoutStarted = require("../services/scheduler/jobs/sendPayoutStarted");
exports.endpoint = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_HOOK_SECRET
    );
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const eventType = event.type;

  switch (eventType) {
    case "payout.created":
      console.log(Date.now(), ": PAYOUT CREATED");
      console.log(event);
      break;
    case "payout.paid":
      console.log(Date.now(), ": PAYOUT PAID");
      console.log(event);
      sendPayoutStarted(
        event.data.object.metadata.user_email,
        event.data.object.metadata.amount
      );
      break;
    case "payout.failed":
      console.log(Date.now(), ": PAYOUT FAILED");
      console.log(event);
      sendBankErrorNotification(event.data.object.metadata.user_email);
      break;
    default:
      var strung = JSON.stringify([event.created, event.id, event.type]);
      strung = strung.substring(1, string.length - 1);
      fs.appendFile(
        path.join(process.cwd(), "logs/msg.txt"),
        strung + "\n",
        function (err) {
          if (err) throw err;
        }
      );
      break;
  }
};
