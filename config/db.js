const mongoose = require("mongoose");

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is missing in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri); // no need for options in v6+
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ Database connection error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
