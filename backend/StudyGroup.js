const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studyGroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String, // URL to the group's avatar image
      default: null,
    },
  },
  { timestamps: true }
);

const StudyGroup = mongoose.model('StudyGroup', studyGroupSchema);

module.exports = StudyGroup;