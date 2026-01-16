import cron from "node-cron";
import userModel from "../models/user.model.js";
import { Task } from "../models/task.model.js";
import { sendEmail } from "../utils/mailer.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";

// Run every day at 8:00 PM (20:00)
cron.schedule("0 20 * * *", async () => {
  console.log("⏰ Running Daily Task Reminder Job...");

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const users = await userModel.find({});

    for (const user of users) {
      // Find incomplete tasks for today
      const pendingTasks = await Task.countDocuments({
        userId: user._id,
        date: { $gte: todayStart, $lte: todayEnd },
        isCompleted: false,
      });

      if (pendingTasks > 0) {
        const emailHtml = getEmailTemplate({
          title: "🌙 Nightly Check-in",
          body: `
            <p>Hi <span class="highlight">${user.name}</span>,</p>
            <p>You still have <strong style="color: #ef4444; font-size: 18px;">${pendingTasks}</strong> tasks pending for today.</p>
            <p>It's not too late to knock a few out! 👊</p>
            <div style="text-align: center; margin-top: 30px;">
               <a href="#" class="cta-button">Finish Tasks</a>
            </div>
          `,
          footerText: "Small steps every day add up! 📈",
        });

        await sendEmail({
          to: user.email,
          subject: `🌙 You have ${pendingTasks} tasks left!`,
          html: emailHtml,
        });
      }
    }
  } catch (error) {
    console.error("Error in reminder job:", error);
  }
});
