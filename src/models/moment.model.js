import mongoose from "mongoose";

const momentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Firsts",
        "Adventure",
        "Date Night",
        "Reunion",
        "Silly Moment",
        "Milestone",
        "Travel",
        "Future Goal",
        "Trip",
        "Date",
        "Meeting",
        "Other",
      ],
      default: "Other",
    },
    location: {
      type: String,
      default: "",
    },
    icon: {
      type: String, // lucide icon name
      default: "Heart",
    },
    isShared: {
      type: Boolean,
      default: true, // Moments usually shared in LDR
    },
  },
  { timestamps: true },
);

export const Moment = mongoose.model("Moment", momentSchema);
