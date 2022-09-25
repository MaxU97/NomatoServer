const autoCancelBooking = () => {
  try {
    const axios = require("axios");
    const https = require("https");
    const api = axios.create({
      baseURL: `${process.env.API_URL}api/`,
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });

    api.interceptors.request.use(function (config) {
      config.headers["x-access-token"] = process.env.AUTO_UPDATER_TOKEN;

      return config;
    });

    api
      .post("booking/checkBookings", { da: "da" })
      .then(({ data }) => {
        console.log(data);
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log(err);
  }
};

autoCancelBooking();
