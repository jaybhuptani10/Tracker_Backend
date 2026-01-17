import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastStreakDate: {
      type: Date,
      default: null,
    },
    lastNudge: {
      message: String,
      from: String,
      timestamp: Date,
      seen: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);
const userModel = mongoose.model("User", userSchema);
export default userModel;
