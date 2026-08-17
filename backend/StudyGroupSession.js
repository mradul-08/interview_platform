const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studyGroupSessionSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'StudyGroup',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    scheduledTime: {
      type: Date,
      required: true,
    },
    meetingLink: {
      type: String, // e.g., Google Meet, Zoom link
    },
  },
  { timestamps: true }
);

const StudyGroupSession = mongoose.model('StudyGroupSession', studyGroupSessionSchema);

module.exports = StudyGroupSession;