const { Balance, User } = require("../models");

exports.getBalances = async (userId) => {
  const balances = await Balance.findAll({
    where: { userId },
    include: [
      {
        model: User,
        as: "owesToUser",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  return balances.map((b) => ({
    from: b.userId,
    to: b.owesToUser.name,
    amount: b.amount,
  }));
};
