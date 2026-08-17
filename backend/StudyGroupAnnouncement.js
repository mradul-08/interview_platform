const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studyGroupAnnouncementSchema = new Schema(
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
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const StudyGroupAnnouncement = mongoose.model('StudyGroupAnnouncement', studyGroupAnnouncementSchema);

module.exports = StudyGroupAnnouncement;