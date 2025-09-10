const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: [
        "HR",
        "IT",
        "Sales",
        "Marketing",
        "Production",
        "Purchase",
        "Accounts",
        "admin",
      ],
      default: "IT", // 👈 set whichever you want as default
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
