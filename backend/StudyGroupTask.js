const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studyGroupTaskSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'GeminiStudyGroup',
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
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['TODO', 'IN_PROGRESS', 'DONE'],
      default: 'TODO',
    },
  },
  { timestamps: true }
);

const StudyGroupTask = mongoose.model('StudyGroupTask', studyGroupTaskSchema);

module.exports = StudyGroupTask;
