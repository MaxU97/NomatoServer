const axios = require("axios");

exports.checkLanguages = (descEN, descLV, descRU) => {
  let EN, LV, RU;
  let en, lv, ru;
  if (descEN.length == 0) {
    en = true;
  } else {
    EN = descEN;
    en = false;
  }

  if (descRU.length == 0) {
    ru = true;
  } else {
    LV = descLV;
    ru = false;
  }

  if (descLV.length == 0) {
    lv = true;
  } else {
    RU = descRU;
    lv = false;
  }

  if (en) {
    EN = !lv ? translate(descRU, "en", "ru") : translate(descLV, "en", "lv");
  }
  if (ru) {
    RU = !en ? translate(descEN, "ru", "en") : translate(descLV, "ru", "lv");
  }
  if (lv) {
    LV = !en ? translate(descEN, "lv", "en") : translate(descRU, "lv", "ru");
  }

  return [EN, RU, LV];
};

const translate = async (text, to, from) => {
  const encodedParams = new URLSearchParams();
  encodedParams.append("text", text);
  encodedParams.append("to", to);
  encodedParams.append("from", from);
  const options = {
    method: "POST",
    url: "https://nlp-translation.p.rapidapi.com/v1/translate",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "X-RapidAPI-Host": "nlp-translation.p.rapidapi.com",
      "X-RapidAPI-Key": "c5c9bf999amshea9393e53a72314p141ec6jsn3b0184769137",
    },
    data: encodedParams,
  };

  // return axios.request("localhost:4000/").then((result) => {
  //   let returnValue;
  //   try {
  //     Object.keys(result.data["translated_text"]).forEach((key) => {
  //       returnValue = result.data["translated_text"][key];
  //     });
  //   } catch (err) {
  //     returnValue = text + err.toString();
  //   }

  //   return returnValue;
  // });

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(text);
    }, 300);
  });
};
