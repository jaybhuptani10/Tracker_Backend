import asyncHandler from "../utils/asynchandler.js";
import userModel from "../models/user.model.js";
import { Task } from "../models/task.model.js";
import { sendEmail } from "../utils/mailer.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";
import { ApiResponse } from "../utils/apiresponse.js";

const triggerDailyReminders = asyncHandler(async (req, res) => {
  const { secret } = req.query;

  // Simple security check (in real app, use headers or a better secret management)
  // For now, checks if provided secret matches env var or a default
  const CRON_SECRET = process.env.CRON_SECRET || "duotrack_reminder_secret";
  if (secret !== CRON_SECRET) {
    return res
      .status(401)
      .json(new ApiResponse(false, "Unauthorized: Invalid Cron Secret"));
  }

  console.log("⏰ Triggering Daily Task Reminder Job via API...");
  let emailsSent = 0;

  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const users = await userModel.find({});

    for (const user of users) {
      if (!user.email) continue;

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
               <a href="${process.env.FRONTEND_URL || "#"}" class="cta-button">Finish Tasks</a>
            </div>
          `,
          footerText: "Small steps every day add up! 📈",
        });

        await sendEmail({
          to: user.email,
          subject: `🌙 You have ${pendingTasks} pending tasks`,
          html: emailHtml,
        });

        emailsSent++;
      }
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          true,
          `Reminder job completed. Sent ${emailsSent} emails.`,
        ),
      );
  } catch (error) {
    console.error("Error in reminder job:", error);
    return res
      .status(500)
      .json(new ApiResponse(false, "Job failed", error.message));
  }
});

export { triggerDailyReminders };
