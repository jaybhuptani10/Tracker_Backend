import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/user.model.js";

dotenv.config({ path: "./.env" });

const makeAdmin = async () => {
  const email = process.argv[2];
  if (!email) {
    console.error("Please provide an email address");
    process.exit(1);
  }

  try {
    const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI;
    if (!mongoUrl) {
      console.error("MONGODB_URL or MONGODB_URI not found in .env");
      process.exit(1);
    }
    await mongoose.connect(mongoUrl);
    console.log("Connected to MongoDB");

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.error("User not found");
      process.exit(1);
    }

    user.isAdmin = true;
    await user.save();
    console.log(`Successfully made ${user.name} (${user.email}) an Admin!`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

makeAdmin();
