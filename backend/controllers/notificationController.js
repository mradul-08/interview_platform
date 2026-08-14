const Notification = require("../models/Notification");

exports.listNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, readAt: null });
    res.json({ success: true, notifications, unreadCount });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Failed to load notifications" }); }
};

exports.markRead = async (req, res) => {
  try {
    const result = await Notification.updateOne({ _id: req.params.id, userId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true, updated: result.modifiedCount > 0 });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Failed to update notification" }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
    res.json({ success: true });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Failed to update notifications" }); }
};
