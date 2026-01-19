const service = require("../services/balance.service");

exports.getBalances = async (req, res) => {
  res.json(await service.getBalances(req.params.userId));
};

exports.settle = async (req, res) => {
  await service.settle(req.body.from, req.body.to, req.body.amount);
  res.sendStatus(200);
};
