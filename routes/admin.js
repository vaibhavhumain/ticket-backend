const express = require("express");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/roleMiddleware");
const User = require("./model/User");
const Ticket = require("../models/Ticket");

const router = express.Router();

router.get("/tickets", auth, requireRole("admin"), async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all users
router.get("/users", async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

// Update role
router.put("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
  res.json(user);
});

// Reports
router.get("/reports", async (req, res) => {
  const totalTickets = await Ticket.countDocuments();
  const open = await Ticket.countDocuments({ status: "open" });
  const resolved = await Ticket.countDocuments({ status: "resolved" });
  const closed = await Ticket.countDocuments({ status: "closed" });
  const high = await Ticket.countDocuments({ priority: "high" });
  const medium = await Ticket.countDocuments({ priority: "medium" });
  const low = await Ticket.countDocuments({ priority: "low" });

  res.json({ totalTickets, open, resolved, high, medium, low });
});


module.exports = router;
