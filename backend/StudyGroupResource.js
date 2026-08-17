const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studyGroupResourceSchema = new Schema(
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
    link: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const StudyGroupResource = mongoose.model('StudyGroupResource', studyGroupResourceSchema);

module.exports = StudyGroupResource;