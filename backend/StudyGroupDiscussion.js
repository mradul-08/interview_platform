const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studyGroupDiscussionSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'StudyGroup',
      required: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    replies: [
      {
        authorId: { type: Schema.Types.ObjectId, ref: 'User' },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const StudyGroupDiscussion = mongoose.model('StudyGroupDiscussion', studyGroupDiscussionSchema);

module.exports = StudyGroupDiscussion;