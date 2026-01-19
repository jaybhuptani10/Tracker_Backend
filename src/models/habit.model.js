import mongoose from "mongoose";

const habitSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // We store dates representing the MIDNIGHT of the day completed
    completedDates: [
      {
        type: String, // Storing as YYYY-MM-DD string is often easier for habit tracking to avoid timezone shifts
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    streak: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Habit = mongoose.model("Habit", habitSchema);
