import mongoose from "mongoose";
import dotenv from "dotenv";
import { WorkSession } from "./src/models/workSession.model.js";
import userModel from "./src/models/user.model.js";

dotenv.config();

const resetFocusTime = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log("⏱️  Connected to DB for FOCUS TIME reset...");

    const email = "jaybhuptani1054@gmail.com";
    const user = await userModel.findOne({ email });

    if (!user) {
      console.log("❌ User not found!");
      process.exit(1);
    }

    const userIds = [user._id];
    console.log(`👤 Found Main User: ${user.name}`);

    if (user.partnerId) {
      const partner = await userModel.findById(user.partnerId);
      if (partner) {
        userIds.push(partner._id);
        console.log(`👥 Found Partner: ${partner.name}`);
      }
    }

    console.log(`\n🚨 DELETING FOCUS HISTORY FOR ${userIds.length} USERS...`);

    // ONLY Delete Work Sessions
    const sessions = await WorkSession.deleteMany({ userId: { $in: userIds } });
    console.log(
      `✅ Deleted ${sessions.deletedCount} corrupted focus sessions.`,
    );
    console.log("✅ Tasks, Streaks, and XP remain UNTOUCHED.");

    console.log("\n✨ FOCUS TIME RESET COMPLETE! ✨");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during reset:", error);
    process.exit(1);
  }
};

resetFocusTime();
