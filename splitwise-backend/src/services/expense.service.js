const { Expense, Balance } = require("../models");

exports.addExpense = async ({ amount, paidBy, groupId, participants }) => {
  await Expense.create({
    amount,
    paidBy,
    groupId,
  });

  const share = amount / (participants.length - 1);

  for (const userId of participants) {
    if (userId !== paidBy) {
      await Balance.create({
        userId: userId,
        owesTo: paidBy,
        amount: share,
      });
    }
  }
};
