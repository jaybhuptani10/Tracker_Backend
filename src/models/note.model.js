import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    content: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["SHARED", "PERSONAL"],
      default: "SHARED",
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export const Note = mongoose.model("Note", noteSchema);
