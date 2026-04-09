const mongoose = require('mongoose');

const HouseholdSchema = new mongoose.Schema(
{
  HouseholdID:
  {
    type: Number,
    required: true,
    unique: true
  },
  HouseholdName:
  {
    type: String,
    required: true,
    trim: true
  },
  MemberIDs:
  {
    type: [Number],
    default: []
  },
  InviteCode:
  {
    type: String,
    trim: true,
    uppercase: true,
    unique: true,
    sparse: true
  },
  CreatedAt:
  {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('Household', HouseholdSchema, 'Households');
