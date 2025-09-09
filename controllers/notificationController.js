const Notification = require("../models/Notification");

// ✅ Get all notifications for logged-in user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate("ticket", "title status") // show ticket title + status
      .sort({ createdAt: -1 });

    res.status(200).json(notifications);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err.message);
    res.status(500).json({ message: "Failed to fetch notifications", error: err.message });
  }
};

// ✅ Mark a single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (err) {
    console.error("❌ Error marking notification as read:", err.message);
    res.status(500).json({ message: "Failed to update notification", error: err.message });
  }
};

// ✅ Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("❌ Error marking all as read:", err.message);
    res.status(500).json({ message: "Failed to update notifications", error: err.message });
  }
};

// ✅ Delete a single notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({ message: "Notification deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting notification:", err.message);
    res.status(500).json({ message: "Failed to delete notification", error: err.message });
  }
};

// ✅ Delete all notifications for logged-in user
exports.clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ user: req.user.id });

    res.status(200).json({ message: "All notifications cleared" });
  } catch (err) {
    console.error("❌ Error clearing notifications:", err.message);
    res.status(500).json({ message: "Failed to clear notifications", error: err.message });
  }
};
