exports.getDaysBetween = (s, e) => {
  for (
    var a = [], d = new Date(s);
    d <= new Date(e);
    d.setDate(d.getDate() + 1)
  ) {
    a.push(new Date(d));
  }
  return a;
};

exports.filterDates = (object, itemQty) => {
  return Object.keys(object).filter(function (el) {
    return object[el] >= itemQty;
  });
};

exports.getDatesWithinRange = (dates, from, to) => {
  return dates.map((date) => {
    if (date >= new Date(from) && date <= new Date(to)) {
      return date;
    }
  });
};
