const mongoose = require('mongoose');

const RecurringChoreTemplateSchema = new mongoose.Schema(
{
  RecurringTemplateID:
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
  DefaultAssignedUserID:
  {
    type: Number,
    required: true
  },
  RepeatFrequency:
  {
    type: String,
    required: true
  },
  RepeatInterval:
  {
    type: Number,
    default: 1
  },
  NextDueDate:
  {
    type: String,
    required: true
  },
  IsActive:
  {
    type: Boolean,
    default: true
  },
  CreatedByUserID:
  {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model(
  'RecurringChoreTemplate',
  RecurringChoreTemplateSchema,
  'recurringChoreTemplates'
);
