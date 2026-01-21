import User from "../models/user.model.js";
import { Task } from "../models/task.model.js";
import { Habit } from "../models/habit.model.js";
import { Expense } from "../models/expense.model.js";
import { WorkSession } from "../models/workSession.model.js";

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalTasks,
      totalHabits,
      totalExpenses,
      totalWorkSessions,
    ] = await Promise.all([
      User.countDocuments(),
      Task.countDocuments(),
      Habit.countDocuments(),
      Expense.countDocuments(),
      WorkSession.countDocuments(),
    ]);

    // Active users (users who have created a task/habit/session in last 7 days)
    // For simplicity, let's just count total users for now, or users with a partner
    const usersWithPartners = await User.countDocuments({
      partnerId: { $ne: null },
    });

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email createdAt streak");

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalTasks,
        totalHabits,
        totalExpenses,
        totalWorkSessions,
        usersWithPartners,
      },
      recentUsers,
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
