import mongoose from "mongoose";
import dotenv from "dotenv";
import { Task } from "./src/models/task.model.js";
import userModel from "./src/models/user.model.js";

dotenv.config();

const checkMyStats = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to DB");

    const email = "jaybhuptani1054@gmail.com";
    const user = await userModel.findOne({ email });

    if (!user) {
      console.log("User not found: " + email);
      process.exit(0);
    }

    console.log(`Checking stats for: ${user.name} (${user._id})`);

    const totalTasks = await Task.countDocuments({ userId: user._id });
    const completedTasks = await Task.countDocuments({
      userId: user._id,
      isCompleted: true,
    });

    console.log(`- Total Tasks: ${totalTasks}`);
    console.log(`- Completed Tasks: ${completedTasks}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

checkMyStats();
