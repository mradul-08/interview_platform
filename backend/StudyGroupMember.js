const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studyGroupMemberSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'StudyGroup',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER'],
      default: 'MEMBER',
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

const StudyGroupMember = mongoose.model('StudyGroupMember', studyGroupMemberSchema);

module.exports = StudyGroupMember;