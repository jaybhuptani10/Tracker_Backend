import mongoose from "mongoose";
import dotenv from "dotenv";
import { Task } from "./src/models/task.model.js";
import userModel from "./src/models/user.model.js";

dotenv.config();

const checkUserTasks = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to DB");

    // Get a sample completed task
    const completedTask = await Task.findOne({ isCompleted: true });

    if (completedTask) {
      console.log("Found a completed task:");
      console.log("Task ID:", completedTask._id);
      console.log("Task Content:", completedTask.content);
      console.log("Task Owner ID:", completedTask.userId);

      // Find the user who owns this task
      const user = await userModel.findById(completedTask.userId);
      if (user) {
        console.log("Task Owner Name:", user.name);
        console.log("Task Owner Email:", user.email);
      } else {
        console.log("Owner NOT found! Orphaned task?");
      }
    } else {
      console.log("No completed tasks found at all.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

checkUserTasks();
