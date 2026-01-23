import mongoose from "mongoose";
import dotenv from "dotenv";
import { Task } from "./src/models/task.model.js";

dotenv.config();

const checkTasks = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("Connected to DB");

    const tasks = await Task.find({});
    console.log(`Found ${tasks.length} total tasks`);

    if (tasks.length > 0) {
      console.log("First 5 tasks sample:");
      tasks.slice(0, 5).forEach((t) => {
        console.log({
          id: t._id,
          content: t.content,
          isCompleted: t.isCompleted,
          userId: t.userId,
        });
      });

      const completedCount = await Task.countDocuments({ isCompleted: true });
      console.log(`Total completed tasks: ${completedCount}`);
    } else {
      console.log("No tasks found in database!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
};

checkTasks();
