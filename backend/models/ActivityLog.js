const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
{
  LogID:
  {
    type: Number,
    required: true,
    unique: true
  },
  HouseholdID:
  {
    type: Number,
    required: true
  },
  UserID:
  {
    type: Number,
    required: true
  },
  Action:
  {
    type: String,
    required: true
  },
  TargetType:
  {
    type: String,
    required: true
  },
  TargetID:
  {
    type: Number,
    required: true
  },
  CreatedAt:
  {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema, 'activityLog');
