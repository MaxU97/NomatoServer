const axios = require("axios");

exports.checkLanguage = (description) => {
  const axios = require("axios");

  const data = [
    {
      Text: description,
    },
  ];
  const options = {
    method: "POST",
    url: "https://microsoft-translator-text.p.rapidapi.com/Detect",
    params: { "api-version": "3.0" },
    headers: {
      "content-type": "application/json",
      "X-RapidAPI-Key": "c5c9bf999amshea9393e53a72314p141ec6jsn3b0184769137",
      "X-RapidAPI-Host": "microsoft-translator-text.p.rapidapi.com",
    },
    data: JSON.stringify(data),
  };

  return axios
    .request(options)
    .then(function (response) {
      return response.data;
    })
    .catch(function (error) {
      console.error(error);
    });
};

exports.getTranslation = async (description, language) => {
  var desc = "";
  description.every((value, index) => {
    if (value[language]) {
      desc = value;
      return false;
    }
    return true;
  });

  if (!desc) {
    desc = await translate(Object.values(description[0])[0], language);
  }
  return desc;
};
const translate = async (text, to) => {
  const data = [
    {
      Text: text,
    },
  ];
  const options = {
    method: "POST",
    url: "https://microsoft-translator-text.p.rapidapi.com/translate",
    params: {
      "to[0]": to,
      "api-version": "3.0",
      profanityAction: "NoAction",
      textType: "plain",
    },
    headers: {
      "content-type": "application/json",
      "X-RapidAPI-Key": "c5c9bf999amshea9393e53a72314p141ec6jsn3b0184769137",
      "X-RapidAPI-Host": "microsoft-translator-text.p.rapidapi.com",
    },
    data: JSON.stringify(data),
  };

  return await axios
    .request(options)
    .then(function (response) {
      return {
        [response.data[0]["translations"][0].to]:
          response.data[0]["translations"][0].text,
      };
    })
    .catch(function (error) {
      console.error(error);
    });
};
