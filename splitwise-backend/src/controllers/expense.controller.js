const service = require("../services/expense.service");

exports.addExpense = async (req, res) => {
  await service.addExpense(req.body);
  res.sendStatus(201);
};
