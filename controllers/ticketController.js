const Ticket = require("../models/Ticket");
const Notification = require("../models/Notification");
const sendEmail = require("../utils/email");

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
    });

    await ticket.save();

    const populatedTicket = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");

    await Notification.create({
      user: req.user.id,
      ticket: ticket._id,
      title: `🎉 Ticket Raised: ${ticket.title}`,
    });
    await sendEmail({
      to: populatedTicket.createdBy.email,
      subject: `🎉 Ticket Created: ${ticket.title}`,
      text: `Your ticket "${ticket.title}" has been created.`,
      html: `<p>Your ticket <b>${ticket.title}</b> has been created successfully.</p>`,
    });

    if (assignedTo && populatedTicket.assignedTo) {
      await Notification.create({
        user: assignedTo,
        ticket: ticket._id,
        title: `📌 You have been assigned a ticket: ${ticket.title}`,
      });
      await sendEmail({
        to: populatedTicket.assignedTo.email,
        subject: `📌 New Ticket Assigned: ${ticket.title}`,
        text: `A new ticket "${ticket.title}" has been assigned to you.`,
        html: `<p>You have been assigned a new ticket: <b>${ticket.title}</b>.</p>`,
      });
    }

    req.io.emit("ticketCreated", populatedTicket);
    res.status(201).json(populatedTicket);
  } catch (err) {
    res.status(500).json({ message: "Failed to create ticket", error: err.message });
  }
};

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
    res.status(500).json({ message: "Failed to fetch tickets", error: err.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("history.changedBy", "name email")
      .populate("comments.addedBy", "name email");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (req.user.role === "admin") return res.status(200).json(ticket);

    const isCreator = ticket.createdBy?._id?.toString() === req.user.id;
    const isAssignee =
      ticket.assignedTo &&
      (ticket.assignedTo._id?.toString() === req.user.id ||
        ticket.assignedTo.toString() === req.user.id);

    if (isCreator || isAssignee) return res.status(200).json(ticket);

    return res.status(403).json({ message: "Not authorized" });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch ticket", error: err.message });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { title, description, priority, status, category, assignedTo, attachments } = req.body;
    const ticket = await Ticket.findById(req.params.id).populate("createdBy", "name email assignedTo");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (req.user.role === "admin" || ticket.createdBy._id.toString() === req.user.id) {
      if (title) ticket.title = title;
      if (description) ticket.description = description;
      if (priority) ticket.priority = priority;
      if (category) ticket.category = category;
      if (attachments) ticket.attachments = attachments;

      if (assignedTo && assignedTo !== ticket.assignedTo?.toString()) {
        ticket.assignedTo = assignedTo;
        const updatedTicketAssignee = await Ticket.findById(ticket._id).populate("assignedTo", "name email");
        await Notification.create({
          user: assignedTo,
          ticket: ticket._id,
          title: `📌 You have been assigned a ticket: ${ticket.title}`,
        });
        await sendEmail({
          to: updatedTicketAssignee.assignedTo.email,
          subject: `📌 Ticket Assigned: ${ticket.title}`,
          text: `You have been assigned ticket "${ticket.title}".`,
          html: `<p>You are now assigned to ticket: <b>${ticket.title}</b>.</p>`,
        });
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

      await Notification.create({
        user: ticket.createdBy,
        ticket: ticket._id,
        title: `⚡ Ticket "${ticket.title}" status changed to ${status}`,
      });
      await sendEmail({
        to: ticket.createdBy.email,
        subject: `⚡ Ticket "${ticket.title}" status changed`,
        text: `Your ticket "${ticket.title}" is now ${status}.`,
        html: `<p>Status of ticket <b>${ticket.title}</b> has been updated to <b>${status}</b>.</p>`,
      });
    }

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("comments.addedBy", "name email")
      .populate("history.changedBy", "name email");

    req.io.emit("ticketUpdated", updatedTicket);
    res.status(200).json(updatedTicket);
  } catch (err) {
    res.status(500).json({ message: "Failed to update ticket", error: err.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (ticket.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete this ticket" });
    }

    await ticket.deleteOne();
    req.io.emit("ticketDeleted", { id: req.params.id });
    res.status(200).json({ message: "Ticket deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete ticket", error: err.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { text, status } = req.body;
    const ticket = await Ticket.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email");
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (text && text.trim() !== "") {
      ticket.comments.push({ text, addedBy: req.user.id });
      await sendEmail({
        to: ticket.createdBy.email,
        subject: `💬 New comment on ticket "${ticket.title}"`,
        text: `A new comment has been added to your ticket.`,
        html: `<p>A new comment was added to ticket <b>${ticket.title}</b>.</p>`,
      });
    }

    if (status && status !== ticket.status) {
      ticket.status = status;
      ticket.history.push({ status, changedBy: req.user.id });

      if (["resolved", "closed"].includes(status)) {
        await Notification.create({
          user: ticket.createdBy._id,
          ticket: ticket._id,
          title: `✅ Ticket "${ticket.title}" has been marked as ${status}`,
        });
        await sendEmail({
          to: ticket.createdBy.email,
          subject: `✅ Ticket "${ticket.title}" marked as ${status}`,
          text: `Your ticket "${ticket.title}" is now ${status}.`,
          html: `<p>Your ticket <b>${ticket.title}</b> has been marked as <b>${status}</b>.</p>`,
        });
      }

      if (ticket.assignedTo && ticket.assignedTo.toString() !== req.user.id) {
        await Notification.create({
          user: ticket.assignedTo,
          ticket: ticket._id,
          title: `⚡ Ticket "${ticket.title}" status changed to ${status}`,
        });
        await sendEmail({
          to: ticket.assignedTo.email,
          subject: `⚡ Ticket "${ticket.title}" status changed`,
          text: `The ticket "${ticket.title}" is now ${status}.`,
          html: `<p>The ticket <b>${ticket.title}</b> is now <b>${status}</b>.</p>`,
        });
      }
    }

    await ticket.save();

    const updatedTicket = await Ticket.findById(ticket._id)
      .populate("createdBy", "name email")
      .populate("assignedTo", "name email")
      .populate("comments.addedBy", "name email")
      .populate("history.changedBy", "name email");

    req.io.emit("ticketUpdated", updatedTicket);
    res.status(200).json(updatedTicket);
  } catch (err) {
    res.status(500).json({ message: "Failed to add comment", error: err.message });
  }
};
 