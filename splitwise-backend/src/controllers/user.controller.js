const service = require("../services/user.service");

exports.createUser = async (req, res) => {
  const user = await service.createUser(req.body);
  res.json(user);
};
