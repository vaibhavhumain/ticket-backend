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

router.get("/users", auth, requireRole("admin"), async (req, res) => {
  try {
    const {
      role,            // department filter
      priority,        // high, medium, low
      assignedAfter,   // date filter (ISO string)
      assignedBefore,
      resolvedAfter,
      resolvedBefore,
    } = req.query;

    // Filter users by role (department) if given
    const userFilter = role ? { role } : {};
    const users = await User.find(userFilter).select("-password");

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // base queries
        let raisedQuery = { createdBy: user._id };
        let resolvedQuery = {
          assignedTo: user._id,
          status: { $in: ["resolved", "closed"] },
        };

        // filter by priority
        if (priority) {
          raisedQuery.priority = priority;
          resolvedQuery.priority = priority;
        }

        // filter by assigned date (ticket creation time)
        if (assignedAfter || assignedBefore) {
          resolvedQuery.createdAt = {};
          if (assignedAfter) resolvedQuery.createdAt.$gte = new Date(assignedAfter);
          if (assignedBefore) resolvedQuery.createdAt.$lte = new Date(assignedBefore);
        }

        // filter by resolved date (last update)
        if (resolvedAfter || resolvedBefore) {
          resolvedQuery.updatedAt = {};
          if (resolvedAfter) resolvedQuery.updatedAt.$gte = new Date(resolvedAfter);
          if (resolvedBefore) resolvedQuery.updatedAt.$lte = new Date(resolvedBefore);
        }

        const ticketsRaised = await Ticket.countDocuments(raisedQuery);
        const ticketsResolved = await Ticket.countDocuments(resolvedQuery);

        // ✅ Get highest priority ticket assigned to the user
        const priorities = ["high", "medium", "low"];
        let userPriority = null;

        for (const p of priorities) {
          const exists = await Ticket.exists({ assignedTo: user._id, priority: p });
          if (exists) {
            userPriority = p;
            break; // stop at the first (highest) match
          }
        }

        return {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          priority: userPriority, // now each user has high/medium/low
          ticketsRaised,
          ticketsResolved,
        };
      })
    );

    res.json(usersWithStats);
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
