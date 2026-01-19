const service = require("../services/group.service");

exports.createGroup = async (req, res) => {
  res.json(await service.createGroup(req.body.name));
};

exports.addUser = async (req, res) => {
  await service.addUserToGroup(req.params.id, req.body.userId);
  res.sendStatus(200);
};
