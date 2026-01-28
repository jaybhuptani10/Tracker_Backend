import mongoose from "mongoose";

const journalSchema = new mongoose.Schema(
  {
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
    title: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
    mood: {
      type: String,
      enum: [
        "happy",
        "neutral",
        "sad",
        "excited",
        "stressed",
        "tired",
        "grateful",
      ],
      default: "neutral",
    },
    tags: [
      {
        type: String,
      },
    ],
    font: {
      type: String,
      default: "serif",
    },
  },
  { timestamps: true },
);

export const Journal = mongoose.model("Journal", journalSchema);
