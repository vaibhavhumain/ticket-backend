require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const userRoutes = require("./routes/userRoutes");
const app = express();

// Middleware
app.use(cors({
  origin: ["https://tickraise.netlify.app"], // ✅ allow only your frontend
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use("/api/auth",authRoutes);
app.use("/api/tickets",ticketRoutes);
app.use("/api/notifications",notificationRoutes);
app.use("/api/users",userRoutes);
// Connect DB (only once!)
connectDB();

// Routes
app.get("/", (req, res) => {
  res.send("Ticket system backend running ✅");
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
