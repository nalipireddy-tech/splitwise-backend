const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { protect } = require('../middleware/auth');
const crypto = require('crypto');

// Create Group
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, groupPicture, categories } = req.body;
    
    const inviteLink = crypto.randomBytes(16).toString('hex');

    const groupData = {
      name,
      description,
      groupPicture,
      createdBy: req.user._id,
      members: [{ user: req.user._id }],
      inviteLink
    };

    if (Array.isArray(categories)) {
      groupData.categories = categories.map(c => String(c));
    }

    const group = await Group.create(groupData);

    await group.populate('members.user', 'name email profilePicture');

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a category to a group
router.post('/:id/categories', protect, async (req, res) => {
  try {
    const { category } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify categories' });
    }

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ message: 'Invalid category' });
    }

    if (!group.categories.includes(category)) {
      group.categories.push(category);
      await group.save();
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove a category from a group
router.delete('/:id/categories/:category', protect, async (req, res) => {
  try {
    const category = decodeURIComponent(req.params.category);
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to modify categories' });
    }

    group.categories = group.categories.filter(c => c !== category);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get All Groups for User
router.get('/', protect, async (req, res) => {
  try {
    const groups = await Group.find({
      'members.user': req.user._id
    }).populate('members.user', 'name email profilePicture')
      .populate('createdBy', 'name email');

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Single Group
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.user', 'name email profilePicture')
      .populate('createdBy', 'name email');

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = group.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view this group' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update Group
router.put('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this group' });
    }

    group.name = req.body.name || group.name;
    group.description = req.body.description || group.description;
    group.groupPicture = req.body.groupPicture || group.groupPicture;

    const updatedGroup = await group.save();
    await updatedGroup.populate('members.user', 'name email profilePicture');

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add Member to Group
router.post('/:id/members', protect, async (req, res) => {
  try {
    const { email } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const User = require('../models/User');
    const userToAdd = await User.findOne({ email });

    // Check if email or user already a member
    const alreadyMemberByEmail = group.members.some(m => m.email && m.email.toLowerCase() === (email || '').toLowerCase());
    const alreadyMemberByUser = userToAdd ? group.members.some(m => m.user && m.user.toString() === userToAdd._id.toString()) : false;

    if (alreadyMemberByEmail || alreadyMemberByUser) {
      return res.status(400).json({ message: 'User is already a member or invited' });
    }

    if (userToAdd) {
      group.members.push({ user: userToAdd._id });
    } else {
      // store as invited email (pending user)
      group.members.push({ email: email });
    }
    await group.save();
    await group.populate('members.user', 'name email profilePicture');

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join Group via Invite Link
router.post('/join/:inviteLink', protect, async (req, res) => {
  try {
    const group = await Group.findOne({ inviteLink: req.params.inviteLink });

    if (!group) {
      return res.status(404).json({ message: 'Invalid invite link' });
    }

    const alreadyMember = group.members.some(
      member => member.user.toString() === req.user._id.toString()
    );

    if (alreadyMember) {
      return res.status(400).json({ message: 'You are already a member' });
    }

    group.members.push({ user: req.user._id });
    await group.save();
    await group.populate('members.user', 'name email profilePicture');

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Leave Group
router.delete('/:id/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.members = group.members.filter(
      member => member.user.toString() !== req.user._id.toString()
    );

    if (group.members.length === 0) {
      await Group.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Group deleted as no members remain' });
    }

    await group.save();
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
// Group balances endpoint
// GET /api/groups/:id/balances
router.get('/:id/balances', protect, async (req, res) => {
  try {
    const { calculateGroupBalances } = require('../utils/balanceCalculator');
    const groupId = req.params.id;

    const result = await calculateGroupBalances(groupId);
    console.log('Balances computed for group', groupId, JSON.stringify(result, null, 2));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;