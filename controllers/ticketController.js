const Ticket = require("../models/Ticket");
const Notification = require("../models/Notification");

// Create a new ticket
exports.createTicket = async (req, res) => {
  try {
    const { title, description, priority, category, assignedTo, attachments } = req.body;

    const ticket = new Ticket({
      title,
      description,
      priority,
      category,
      createdBy: req.user.id,
      assignedTo,
      attachments,
      history: [{ status: "open", changedBy: req.user.id }],
      participants: [
        { user: req.user.id, role: "creator" },
        ...(assignedTo ? [{ user: assignedTo, role: "assignee" }] : []),
      ],
    });

    await ticket.save();

    const creatorNotif = await Notification.create({
      user: req.user.id,
      ticket: ticket._id,
      title: `🎉 Ticket Raised: ${ticket.title}`,
    });
    req.io.to(req.user.id.toString()).emit("notification", creatorNotif);

    if (assignedTo) {
      const assigneeNotif = await Notification.create({
        user: assignedTo,
        ticket: ticket._id,
        title: `📌 You have been assigned a ticket: ${ticket.title}`,
      });
      req.io.to(assignedTo.toString()).emit("notification", assigneeNotif);
    }

    res.status(201).json(ticket);
  } catch (err) {
    console.error("❌ Error creating ticket:", err.message);
    res.status(500).json({ message: "Failed to create ticket", error: err.message });
  }
};

// Get tickets
exports.getTickets = async (req, res) => {
  try {
    if (req.user.role === "admin") {
      const tickets = await Ticket.find({})
        .populate("createdBy", "name email")
        .populate("assignedTo", "name email");
      return res.status(200).json({ all: tickets });
    }

    const raisedByMe = await Ticket.find({ createdBy: req.user.id })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    const assignedToMe = await Ticket.find({ assignedTo: req.user.id })
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    res.status(200).json({ raisedByMe, assignedToMe });
  } catch (err) {
    console.error("❌ Error fetching tickets:", err.message);
    res.status(500).json({ message: "Failed to fetch tickets", error: err.message });
  }
};

// Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("history.changedBy", "name email");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (
      req.user.role !== "admin" &&
      ticket.createdBy._id.toString() !== req.user.id &&
      ticket.assignedTo?.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json(ticket);
  } catch (err) {
    console.error("❌ Error fetching ticket:", err.message);
    res.status(500).json({ message: "Failed to fetch ticket", error: err.message });
  }
};

// Update ticket
exports.updateTicket = async (req, res) => {
  try {
    const { title, description, priority, status, category, assignedTo, attachments } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (req.user.role === "admin" || ticket.createdBy.toString() === req.user.id) {
      if (title) ticket.title = title;
      if (description) ticket.description = description;
      if (priority) ticket.priority = priority;
      if (category) ticket.category = category;
      if (attachments) ticket.attachments = attachments;

      if (assignedTo && assignedTo !== ticket.assignedTo?.toString()) {
        ticket.assignedTo = assignedTo;
        if (!ticket.participants.some(p => p.user.toString() === assignedTo)) {
          ticket.participants.push({ user: assignedTo, role: "assignee" });
        }

        const assigneeNotif = await Notification.create({
          user: assignedTo,
          ticket: ticket._id,
          title: `📌 You have been assigned a ticket: ${ticket.title}`,
        });
        req.io.to(assignedTo.toString()).emit("notification", assigneeNotif);
      }
    }

    if (status && status !== ticket.status) {
      if (
        ticket.assignedTo?.toString() !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ message: "Not authorized to change status" });
      }

      ticket.status = status;
      ticket.history.push({ status, changedBy: req.user.id });

      const creatorNotif = await Notification.create({
        user: ticket.createdBy,
        ticket: ticket._id,
        title: `⚡ Ticket "${ticket.title}" status changed to ${status}`,
      });
      req.io.to(ticket.createdBy.toString()).emit("notification", creatorNotif);
    }

    await ticket.save();
    res.status(200).json(ticket);
  } catch (err) {
    console.error("❌ Error updating ticket:", err.message);
    res.status(500).json({ message: "Failed to update ticket", error: err.message });
  }
};

// Delete ticket
exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this ticket" });
    }

    await ticket.deleteOne();
    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting ticket:", err.message);
    res.status(500).json({ message: "Failed to delete ticket", error: err.message });
  }
};
