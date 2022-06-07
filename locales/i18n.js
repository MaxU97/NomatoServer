const i18next = require("i18next");

i18next.init({
  fallbackLng: "en",
  resources: {
    en: {
      translation: require("./en/translation.json"),
    },
    ru: {
      translation: require("./ru/translation.json"),
    },
    lv: {
      translation: require("./lv/translation.json"),
    },
  },
});

module.exports = (lng) => i18next.getFixedT(lng);
