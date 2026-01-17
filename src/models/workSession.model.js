import mongoose from "mongoose";

const workSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    totalSeconds: {
      type: Number,
      default: 0,
    },
    isRunning: {
      type: Boolean,
      default: false,
    },
    lastStartTime: {
      type: Date,
      default: null,
    },
    sessions: [
      {
        startTime: Date,
        endTime: Date,
        duration: Number, // in seconds
      },
    ],
  },
  { timestamps: true },
);

// Index for faster queries
workSessionSchema.index({ userId: 1, date: 1 });

export const WorkSession = mongoose.model("WorkSession", workSessionSchema);
