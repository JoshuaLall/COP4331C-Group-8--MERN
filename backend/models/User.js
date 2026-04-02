const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
{
  UserID:
  {
    type: Number,
    required: true,
    unique: true
  },
  FirstName:
  {
    type: String,
    required: true,
    trim: true
  },
  LastName:
  {
    type: String,
    required: true,
    trim: true
  },
  Login:
  {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  Password:
  {
    type: String,
    required: true
  },
  Email:
  {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  Verified:
  {
    type: Boolean,
    default: false
  },
  VerifyToken:
  {
    type: String,
    default: ''
  },
  ResetToken:
  {
    type: String,
    default: ''
  },
  ResetExpires:
  {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  HouseholdId:
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

module.exports = mongoose.model('User', UserSchema, 'Users');
