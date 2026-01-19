const { User } = require("../models");

exports.createUser = (data) => {
  return User.create(data);
};
