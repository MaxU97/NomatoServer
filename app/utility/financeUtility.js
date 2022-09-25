exports.getFinances = (fin) => {
  console.log(fin);
  var finMap = fin.map(({ status, amount }) => {
    var obj = {};
    obj[status] = amount;
    return obj;
  });
  finMap = Object.assign({}, ...finMap);

  if (!finMap.withdrawn) {
    finMap.withdrawn = 0;
  }
  if (!finMap.unsettled) {
    finMap.unsettled = 0;
  }
  if (!finMap.settled) {
    finMap.settled = 0;
  }
  finMap.available = finMap.settled + finMap.withdrawn;

  return finMap;
};
