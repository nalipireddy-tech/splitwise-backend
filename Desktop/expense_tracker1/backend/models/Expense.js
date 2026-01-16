const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['Food', 'Travel', 'Rent', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Other']
  },
  date: {
    type: Date,
    default: Date.now
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  splitType: {
    type: String,
    enum: ['equal', 'exact', 'custom'],
    default: 'equal'
  },
  splits: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    amount: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0
    }
  }],
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);