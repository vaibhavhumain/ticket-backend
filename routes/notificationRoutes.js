const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} = require("../controllers/notificationController");

// ✅ Get all notifications for logged-in user
router.get("/", auth, getNotifications);

// ✅ Mark a single notification as read
router.put("/:id/read", auth, markAsRead);

// ✅ Mark all as read
router.put("/read-all", auth, markAllAsRead);

// ✅ Delete a single notification
router.delete("/:id", auth, deleteNotification);

// ✅ Clear all notifications
router.delete("/", auth, clearAllNotifications);

module.exports = router;
