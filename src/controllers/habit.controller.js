import asyncHandler from "../utils/asynchandler.js";
import { Habit } from "../models/habit.model.js";
import { ApiResponse } from "../utils/apiresponse.js";

const createHabit = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { id } = req.user;

  if (!name) {
    return res
      .status(400)
      .json(new ApiResponse(false, "Habit name is required"));
  }

  const habit = await Habit.create({
    name,
    userId: id,
    completedDates: [],
  });

  return res
    .status(201)
    .json(new ApiResponse(true, "Habit created successfully", habit));
});

const getHabits = asyncHandler(async (req, res) => {
  const { id } = req.user;

  const habits = await Habit.find({ userId: id, isActive: true }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(true, "Habits fetched successfully", habits));
});

const toggleHabitDate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { date } = req.body; // Expecting YYYY-MM-DD

  if (!date) {
    return res.status(400).json(new ApiResponse(false, "Date is required"));
  }

  const habit = await Habit.findOne({ _id: id, userId: req.user.id });

  if (!habit) {
    return res.status(404).json(new ApiResponse(false, "Habit not found"));
  }

  const dateIndex = habit.completedDates.indexOf(date);

  if (dateIndex > -1) {
    // Remove (Uncheck)
    habit.completedDates.splice(dateIndex, 1);
  } else {
    // Add (Check)
    habit.completedDates.push(date);
  }

  // Simple streak calculation
  // Sort dates descending
  const dates = [...habit.completedDates].sort().reverse();
  let currentStreak = 0;

  if (dates.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    // If the most recent date is today or yesterday, streak is alive
    if (dates[0] === today || dates[0] === yesterday) {
      currentStreak = 1;
      let checkDate = new Date(dates[0]);

      for (let i = 1; i < dates.length; i++) {
        checkDate.setDate(checkDate.getDate() - 1);
        const expectedStr = checkDate.toISOString().split("T")[0];
        if (dates[i] === expectedStr) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  habit.streak = currentStreak;

  await habit.save();

  return res.status(200).json(new ApiResponse(true, "Habit updated", habit));
});

const deleteHabit = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await Habit.findOneAndDelete({ _id: id, userId: req.user.id });

  return res.status(200).json(new ApiResponse(true, "Habit deleted"));
});

export { createHabit, getHabits, toggleHabitDate, deleteHabit };
