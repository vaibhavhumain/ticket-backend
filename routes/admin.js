const express = require("express");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/roleMiddleware");
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

module.exports = router;
