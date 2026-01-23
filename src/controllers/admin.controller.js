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

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Unlink partner if exists
    if (user.partnerId) {
      await User.findByIdAndUpdate(user.partnerId, {
        $unset: { partnerId: 1 },
      });
    }

    // Delete all associated data
    await Promise.all([
      Task.deleteMany({ userId: id }),
      Habit.deleteMany({ userId: id }),
      Expense.deleteMany({ userId: id }), // Assuming Expense model has userId
      // Check if Expense has userId or if it handles shared differently.
      // Based on previous files, Expense has userId.
      WorkSession.deleteMany({ userId: id }),
    ]);

    await User.findByIdAndDelete(id);

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
