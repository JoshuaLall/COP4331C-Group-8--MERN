const mongoose = require('mongoose');

const ChoreSchema = new mongoose.Schema(
{
  ChoreID:
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
  Title:
  {
    type: String,
    required: true,
    trim: true
  },
  Description:
  {
    type: String,
    default: ''
  },
  Status:
  {
    type: String,
    default: 'open'
  },
  CreatedByUserID:
  {
    type: Number,
    required: true
  },
  AssignedToUserID:
  {
    type: Number,
    default: null
  },
  DueDate:
  {
    type: String,
    default: null
  },
  Priority:
  {
    type: String,
    default: 'medium'
  },
  IsRecurring:
  {
    type: Boolean,
    default: false
  },
  RecurringTemplateID:
  {
    type: Number,
    default: null
  },
  CompletedAt:
  {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  CompletedByUserID:
  {
    type: Number,
    default: null
  },
  CreatedAt:
  {
    type: String,
    required: true
  },
  UpdatedAt:
  {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Chore', ChoreSchema, 'Chores');
