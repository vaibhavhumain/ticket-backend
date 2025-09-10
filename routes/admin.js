const express = require("express");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/roleMiddleware");
const Ticket = require("../models/Ticket");
const User = require("../models/User"); // ✅ Missing import

const router = express.Router();

// Get all tickets (admin only)
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

// Get all users (admin only)
router.get("/users", auth, requireRole("admin"), async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $lookup: {
          from: "tickets",
          localField: "_id",
          foreignField: "createdBy",
          as: "tickets",
        },
      },
      {
        $addFields: {
          ticketsRaised: { $size: "$tickets" },
          ticketsResolved: {
            $size: {
              $filter: {
                input: "$tickets",
                as: "t",
                cond: {
                  $or: [
                    { $eq: ["$$t.status", "resolved"] },
                    { $eq: ["$$t.status", "closed"] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          password: 0, // hide password
          tickets: 0,  // don’t send full ticket list
        },
      },
    ]);

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Update role (admin only)
router.put("/users/:id/role", auth, requireRole("admin"), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Reports (admin only)
router.get("/reports", auth, requireRole("admin"), async (req, res) => {
  try {
    const totalTickets = await Ticket.countDocuments();
    const open = await Ticket.countDocuments({ status: "open" });
    const resolved = await Ticket.countDocuments({ status: "resolved" });
    const high = await Ticket.countDocuments({ priority: "high" });
    const medium = await Ticket.countDocuments({ priority: "medium" });
    const low = await Ticket.countDocuments({ priority: "low" });

    res.json({ totalTickets, open, resolved, high, medium, low });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
