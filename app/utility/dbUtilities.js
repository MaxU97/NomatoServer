const ObjectId = require("mongoose").Types.ObjectId;
exports.isValidObjectId = (id) => {
  if (ObjectId.isValid(id)) {
    if (String(new ObjectId(id)) === id) return true;
    return false;
  }
  return false;
};

exports.isListOfValidObjectIds = (list_ids) => {
  var validate = true;

  list_ids.every((id) => {
    validate = this.isValidObjectId;
    return validate;
  });

  return validate;
};
