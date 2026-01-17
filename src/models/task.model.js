import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    category: {
      type: String,
      enum: ["Work", "Personal", "Workout", "Study", "Other"],
      default: "Other",
    },
    comments: [
      {
        text: String,
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrence: {
      type: {
        type: String,
        enum: ["daily", "weekly", "custom"],
        default: null,
      },
      daysOfWeek: {
        type: [Number], // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        default: [],
      },
      endDate: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
);

export const Task = mongoose.model("Task", taskSchema);
