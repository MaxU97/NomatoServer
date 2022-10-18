exports.parseAddressFull = (address) => {
  return (
    address.street_name +
    ", " +
    address.house_number +
    ", " +
    address.city +
    ", " +
    address.postcode
  );
};

exports.addressType = {
  number: "street_number",
  road: "route",
  sublocality: "sublocality",
  locality: "locality",
  postCode: "postal_code",
};

exports.parseAddressSpecific = (address, type) => {
  var toReturn = "";
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
