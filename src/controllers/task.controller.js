import asyncHandler from "../utils/asynchandler.js";
import { Task } from "../models/task.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import userModel from "../models/user.model.js";
import { sendEmail } from "../utils/mailer.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";

const createTask = asyncHandler(async (req, res) => {
  const { content, category, date } = req.body;
  const { id } = req.user;

  if (!content) {
    return res.status(400).json(new ApiResponse(false, "Content is required"));
  }

  // If date is provided, use it, otherwise default to now (handled by schema default)
  const taskDate = date ? new Date(date) : undefined;

  const task = await Task.create({
    content,
    category,
    date: taskDate,
    userId: id,
  });

  return res
    .status(201)
    .json(new ApiResponse(true, "Task created successfully", task));
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isCompleted } = req.body;

  const task = await Task.findByIdAndUpdate(id, { isCompleted }, { new: true });

  if (!task) {
    return res.status(404).json(new ApiResponse(false, "Task not found"));
  }

  // Gamification & Notification Logic
  if (isCompleted) {
    // 1. Update XP & Streak
    const user = await userModel.findById(req.user.id);
    let xpChange = 10;
    let streakChange = 0;
    let newStreakDate = null;

    // Check if all tasks for this task's date are completed
    if (task.date) {
      const taskDate = new Date(task.date);
      const startOfDay = new Date(taskDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(taskDate);
      endOfDay.setHours(23, 59, 59, 999);

      const dayTasks = await Task.find({
        userId: req.user.id,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      // Current task is already updated in DB (new: true)
      const allCompleted = dayTasks.every((t) => t.isCompleted);

      if (allCompleted && dayTasks.length > 0) {
        // Only increment streak if not already incremented for this date
        // Simple check: if lastStreakDate < startOfDay
        const lastDate = user.lastStreakDate
          ? new Date(user.lastStreakDate)
          : null;
        if (!lastDate || lastDate < startOfDay) {
          streakChange = 1;
          newStreakDate = new Date(); // Record time of streak achievement
        }
      }
    }

    const updateQuery = { $inc: { xp: xpChange } };
    if (streakChange > 0) {
      updateQuery.$inc.streak = streakChange;
      updateQuery.lastStreakDate = newStreakDate;
    }
    await userModel.findByIdAndUpdate(req.user.id, updateQuery);

    // 2. Notify Partner
    if (user && user.partnerId) {
      const partner = await userModel.findById(user.partnerId); // Fixed: Fetch partner
      if (partner) {
        const emailHtml = getEmailTemplate({
          title: `Hey ${partner.name}, Great News! 🎉`,
          body: `
            <p>Your partner <span class="highlight">${
              user.name
            }</span> just crushed a task!</p>
            <div class="task-card">
              <p class="task-content">"${task.content}"</p>
            </div>
            <p>They earned <strong>+10 XP</strong>! Time for you to catch up? 😉</p>
            <div style="text-align: center; margin-top: 30px;">
               <a href="${
                 process.env.FRONTEND_URL || "#"
               }" class="cta-button">Check Dashboard</a>
            </div>
          `,
          footerText: "Stay consistent together! 💪",
        });

        await sendEmail({
          to: partner.email,
          subject: `✅ ${user.name} completed a task! (+10 XP)`,
          html: emailHtml,
        });
      }
    }
  } else {
    // Decrease XP if task unchecked
    await userModel.findByIdAndUpdate(req.user.id, { $inc: { xp: -10 } });
  }

  return res
    .status(200)
    .json(new ApiResponse(true, "Task updated successfully", task));
});

const getDashboard = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const user = await userModel.findById(id);

  // Get date from query or default to today (start of day)
  const queryDate = req.query.date ? new Date(req.query.date) : new Date();
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  // Fetch my tasks
  const myTasks = await Task.find({
    userId: id,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  // Fetch partner's tasks if partner exists
  let partnerTasks = [];
  let partner = null;

  if (user.partnerId) {
    partnerTasks = await Task.find({
      userId: user.partnerId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // Also fetch partner details (name)
    const partnerUser = await userModel
      .findById(user.partnerId)
      .select("name email");
    if (partnerUser) {
      partner = partnerUser;
    }
  }

  return res.status(200).json(
    new ApiResponse(true, "Dashboard fetched successfully", {
      myTasks,
      partnerTasks,
      partner,
    }),
  );
});

const deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const task = await Task.findOneAndDelete({ _id: id, userId: req.user.id });

  if (!task) {
    return res
      .status(404)
      .json(new ApiResponse(false, "Task not found or unauthorized"));
  }

  return res
    .status(200)
    .json(new ApiResponse(true, "Task deleted successfully"));
});

const addTaskComment = asyncHandler(async (req, res) => {
  const { id } = req.params; // Task ID
  const { text } = req.body;
  const { id: userId } = req.user;

  if (!text) {
    return res
      .status(400)
      .json(new ApiResponse(false, "Comment text is required"));
  }

  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json(new ApiResponse(false, "Task not found"));
  }

  task.comments.push({
    text,
    senderId: userId,
  });

  await task.save();

  return res
    .status(200)
    .json(new ApiResponse(true, "Comment added successfully", task));
});

export {
  createTask,
  updateTaskStatus,
  getDashboard,
  deleteTask,
  addTaskComment,
};
