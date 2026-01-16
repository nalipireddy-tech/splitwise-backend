const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { protect } = require('../middleware/auth');

// Create Expense
router.post('/', protect, async (req, res) => {
  try {
    const { title, amount, category, date, group, splitType, splits, notes } = req.body;

    // Validate splits
    if (splits && splits.length > 0) {
      const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplit - amount) > 0.01) {
        return res.status(400).json({ message: 'Split amounts must equal total amount' });
      }
    }

    // If this is a group expense and no splits provided, auto-generate equal splits
    let finalSplits = splits || [];
    if (group && (!splits || splits.length === 0)) {
      const groupDoc = await Group.findById(group).populate('members.user', 'name email');
      const memberIds = (groupDoc?.members || []).map(m => m.user._id.toString());
      if (memberIds.length === 0) {
        // fallback: make payer the only split
        finalSplits = [{ user: req.user._id, amount }];
      } else {
        // distribute amount evenly in cents to avoid floating rounding issues
        const cents = Math.round(Number(amount) * 100);
        const perMember = Math.floor(cents / memberIds.length);
        let remainder = cents - perMember * memberIds.length;

        finalSplits = memberIds.map((uid, idx) => {
          const add = remainder > 0 ? 1 : 0;
          if (remainder > 0) remainder -= 1;
          return { user: uid, amount: (perMember + add) / 100 };
        });
      }
    }

    const expense = await Expense.create({
      title,
      amount,
      category,
      date: date || Date.now(),
      paidBy: req.user._id,
      group: group || null,
      splitType: splitType || 'equal',
      splits: finalSplits,
      notes
    });

    await expense.populate('paidBy', 'name email');
    await expense.populate('splits.user', 'name email');
    if (group) {
      await expense.populate('group', 'name');
    }

    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get All Expenses (Personal + Group)
router.get('/', protect, async (req, res) => {
  try {
    const { startDate, endDate, category, groupId } = req.query;

    let query = {
      $or: [
        { paidBy: req.user._id },
        { 'splits.user': req.user._id }
      ]
    };

    if (groupId) {
      query.group = groupId;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name email profilePicture')
      .populate('splits.user', 'name email')
      .populate('group', 'name')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Personal Expenses Only
router.get('/personal', protect, async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    let query = {
      paidBy: req.user._id,
      group: null
    };

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name email')
      .sort({ date: -1 });

    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Single Expense
router.get('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('paidBy', 'name email profilePicture')
      .populate('splits.user', 'name email')
      .populate('group', 'name');

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    const isAuthorized = 
      expense.paidBy._id.toString() === req.user._id.toString() ||
      expense.splits.some(split => split.user._id.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized to view this expense' });
    }

    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Expense
router.put('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.paidBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this expense' });
    }

    const { title, amount, category, date, splitType, splits, notes } = req.body;

    if (splits && splits.length > 0) {
      const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
      if (Math.abs(totalSplit - (amount || expense.amount)) > 0.01) {
        return res.status(400).json({ message: 'Split amounts must equal total amount' });
      }
    }

    expense.title = title || expense.title;
    expense.amount = amount || expense.amount;
    expense.category = category || expense.category;
    expense.date = date || expense.date;
    expense.splitType = splitType || expense.splitType;
    expense.splits = splits || expense.splits;
    expense.notes = notes !== undefined ? notes : expense.notes;

    const updatedExpense = await expense.save();
    await updatedExpense.populate('paidBy', 'name email');
    await updatedExpense.populate('splits.user', 'name email');
    if (updatedExpense.group) {
      await updatedExpense.populate('group', 'name');
    }

    res.json(updatedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Expense
router.delete('/:id', protect, async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    if (expense.paidBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this expense' });
    }

    await Expense.findByIdAndDelete(req.params.id);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Expense Summary
router.get('/summary/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate, groupId } = req.query;

    let query = {
      $or: [
        { paidBy: req.user._id },
        { 'splits.user': req.user._id }
      ]
    };

    if (groupId) {
      query.group = groupId;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const expenses = await Expense.find(query);

    const totalSpent = expenses.reduce((sum, exp) => {
      if (exp.paidBy.toString() === req.user._id.toString()) {
        return sum + exp.amount;
      }
      return sum;
    }, 0);

    const totalOwed = expenses.reduce((sum, exp) => {
      const userSplit = exp.splits.find(
        split => split.user.toString() === req.user._id.toString()
      );
      return sum + (userSplit ? userSplit.amount : 0);
    }, 0);

    const categoryBreakdown = expenses.reduce((acc, exp) => {
      if (!acc[exp.category]) {
        acc[exp.category] = 0;
      }
      if (exp.paidBy.toString() === req.user._id.toString()) {
        acc[exp.category] += exp.amount;
      }
      return acc;
    }, {});

    res.json({
      totalSpent,
      totalOwed,
      balance: totalSpent - totalOwed,
      categoryBreakdown,
      expenseCount: expenses.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;