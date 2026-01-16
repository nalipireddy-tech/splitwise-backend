const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { calculateGroupBalances } = require('../utils/balanceCalculator');
const Expense = require('../models/Expense');
const Group = require('../models/Group');

// Get Group Balances
router.get('/group/:groupId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    const { balances, settlements } = await calculateGroupBalances(req.params.groupId);

    res.json({ balances, settlements });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Overall Balances (All Groups)
router.get('/all', protect, async (req, res) => {
  try {
    const groups = await Group.find({ 'members.user': req.user._id });
    
    const allBalances = [];
    
    for (const group of groups) {
      const { settlements } = await calculateGroupBalances(group._id);
      
      const userSettlements = settlements.filter(
        s => s.fromId === req.user._id.toString() || s.toId === req.user._id.toString()
      );
      
      allBalances.push({
        groupId: group._id,
        groupName: group.name,
        settlements: userSettlements
      });
    }

    res.json(allBalances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;