exports.parseAddressFull = (address) => {
  var addressString = "";

  address.map((entry, index) => {
    if (address[index + 1] !== undefined) {
      addressString = addressString + entry.long_name + ", ";
    } else {
      addressString = addressString + entry.long_name;
    }
  });
  return addressString;
};

exports.parseAddressSpecific = (address, type) => {
  var toReturn;
  address.map((entry) => {
    if (entry.types.includes(type)) {
      toReturn = entry.long_name;
    }
  });
  return toReturn;
};

exports.getNaturalFromLongLat = async (lat, lng, language) => {
  const NodeGeocoder = require("node-geocoder");
  const options = {
    provider: "google",
    apiKey: process.env.GOOGLE_API_KEY,
  };
  const geocoder = NodeGeocoder(options);
  const res = await geocoder.reverse({ lat: lat, lon: lng });
  return res[0].city;
};
