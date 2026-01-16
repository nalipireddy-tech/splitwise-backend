const Expense = require('../models/Expense');
const Group = require('../models/Group');

const calculateGroupBalances = async (groupId) => {
  // fetch expenses for the group
  const expenses = await Expense.find({ group: groupId }).populate('paidBy splits.user');

  const balances = {};

  for (const expense of expenses) {
    // ensure we have paidBy populated
    const paidById = expense.paidBy?._id?.toString();
    const paidByName = expense.paidBy?.name || 'Unknown';

    if (paidById) {
      if (!balances[paidById]) balances[paidById] = { paid: 0, owe: 0, name: paidByName };
      balances[paidById].paid += expense.amount;
    }

    // If splits are missing, derive equal splits from group members
    let splitsToUse = expense.splits || [];
    if ((!splitsToUse || splitsToUse.length === 0) && expense.group) {
      try {
        const group = await Group.findById(expense.group).populate('members.user', 'name');
        const memberIds = (group?.members || []).map(m => ({ id: m.user._id.toString(), name: m.user.name }));
        if (memberIds.length > 0) {
          const cents = Math.round(Number(expense.amount) * 100);
          const perMember = Math.floor(cents / memberIds.length);
          let remainder = cents - perMember * memberIds.length;

          splitsToUse = memberIds.map(m => {
            const add = remainder > 0 ? 1 : 0;
            if (remainder > 0) remainder -= 1;
            return { user: { _id: m.id, name: m.name }, amount: (perMember + add) / 100 };
          });
        }
      } catch (e) {
        // fallback: treat payer as only participant
        if (paidById) splitsToUse = [{ user: { _id: paidById, name: paidByName }, amount: expense.amount }];
      }
    }

    // accumulate owes
    for (const split of splitsToUse) {
      const userId = split.user?._id ? split.user._id.toString() : (split.user && split.user.toString && split.user.toString());
      const userName = split.user?.name || 'Member';
      if (!userId) continue;
      if (!balances[userId]) balances[userId] = { paid: 0, owe: 0, name: userName };
      balances[userId].owe += (typeof split.amount === 'number') ? split.amount : Number(split.amount || 0);
    }
  }

  const settlements = [];
  const userBalances = Object.keys(balances).map(userId => ({
    userId,
    name: balances[userId].name,
    balance: Number((balances[userId].paid - balances[userId].owe).toFixed(2))
  }));

  const creditors = userBalances.filter(u => u.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors = userBalances.filter(u => u.balance < 0).sort((a, b) => a.balance - b.balance);

  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i].balance;
    const debt = Math.abs(debtors[j].balance);
    const settleAmount = Math.min(credit, debt);

    settlements.push({
      from: debtors[j].name,
      fromId: debtors[j].userId,
      to: creditors[i].name,
      toId: creditors[i].userId,
      amount: Number(settleAmount.toFixed(2))
    });

    creditors[i].balance = Number((creditors[i].balance - settleAmount).toFixed(2));
    debtors[j].balance = Number((debtors[j].balance + settleAmount).toFixed(2));

    if (Math.abs(creditors[i].balance) < 0.01) i++;
    if (Math.abs(debtors[j].balance) < 0.01) j++;
  }

  return { balances: userBalances, settlements };
};

module.exports = { calculateGroupBalances };