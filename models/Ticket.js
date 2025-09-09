const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },

    category: { type: String, default: "general" },

    // Who raised the ticket
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Who it is assigned to (optional)
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // File uploads (screenshots, docs etc.)
    attachments: [{ type: String }],

    // History of status changes
    history: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
