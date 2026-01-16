const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  groupPicture: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    email: {
      type: String,
      default: ''
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  categories: {
    type: [String],
    default: []
  },
  inviteLink: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.models.Group || mongoose.model('Group', groupSchema);