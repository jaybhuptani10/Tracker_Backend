import asyncHandler from "../utils/asynchandler.js";
import { Task } from "../models/task.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import userModel from "../models/user.model.js";
import { sendEmail } from "../utils/mailer.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";

// Helper: Update Streak Logic
const checkAndUpdateStreak = async (userId, taskDate) => {
  if (!taskDate) return;

  const startOfTaskDate = new Date(taskDate);
  startOfTaskDate.setHours(0, 0, 0, 0);
  const endOfTaskDate = new Date(taskDate);
  endOfTaskDate.setHours(23, 59, 59, 999);

  const currentStartOfDay = new Date();
  currentStartOfDay.setHours(0, 0, 0, 0);

  // Rule: Do not count if task date is in past (before today)
  if (startOfTaskDate < currentStartOfDay) return;

  // Check if all tasks for that date are completed
  const dayTasks = await Task.find({
    userId,
    date: { $gte: startOfTaskDate, $lte: endOfTaskDate },
  });

  const allCompleted = dayTasks.every((t) => t.isCompleted);

  if (!allCompleted || dayTasks.length === 0) return;

  const user = await userModel.findById(userId);
  if (!user) return;

  const lastDate = user.lastStreakDate ? new Date(user.lastStreakDate) : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const oneDay = 24 * 60 * 60 * 1000;
  let newStreak = user.streak;

  if (!lastDate) {
    newStreak = 1;
  } else {
    // Diff in days
    const diffDays = Math.round((startOfTaskDate - lastDate) / oneDay);

    if (diffDays === 0) {
      return; // Already accounted
    } else if (diffDays === 1) {
      newStreak += 1; // Consecutive
    } else {
      newStreak = 1; // Gap > 1, Reset
    }
  }

  await userModel.findByIdAndUpdate(userId, {
    streak: newStreak,
    lastStreakDate: new Date(),
  });
};

// Helper: Send Notifications
const sendCompletionNotifications = async (userId, task) => {
  const user = await userModel.findById(userId);
  if (!user) return;

  // Notify Self
  if (user.email) {
    const selfEmailHtml = getEmailTemplate({
      title: `Way to go, ${user.name}! 🎉`,
      body: `
            <p>You just crushed a task!</p>
            <div class="task-card">
              <p class="task-content">"${task.content}"</p>
            </div>
            <p>Keep up the momentum! 💪</p>
            <div style="text-align: center; margin-top: 30px;">
               <a href="${
                 process.env.FRONTEND_URL || "#"
               }" class="cta-button">Check Dashboard</a>
            </div>
          `,
      footerText: "You are doing great! 🌟",
    });

    await sendEmail({
      to: user.email,
      subject: `✅ You completed a task!`,
      html: selfEmailHtml,
    });
  }

  // Notify Partner
  if (user.partnerId) {
    const partner = await userModel.findById(user.partnerId);
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
            <p>Keep up the momentum together! 💪</p>
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
        subject: `✅ ${user.name} completed a task!`,
        html: emailHtml,
      });
    }
  }
};

const createTask = asyncHandler(async (req, res) => {
  const { content, category, date, isRecurring, recurrence, isShared } =
    req.body;
  const { id } = req.user;

  if (!content) {
    return res.status(400).json(new ApiResponse(false, "Content is required"));
  }

  // If date is provided, use it, otherwise default to now (handled by schema default)
  const taskDate = date ? new Date(date) : new Date();

  if (isRecurring && recurrence) {
    // Create recurring task instances
    const tasksToCreate = [];
    const startDate = new Date(taskDate);
    const endDate = recurrence.endDate
      ? new Date(recurrence.endDate)
      : new Date(startDate.getTime() + 90 * 24 * 60 * 60 * 1000); // Default 90 days

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      let shouldCreate = false;

      if (recurrence.type === "daily") {
        shouldCreate = true;
      } else if (recurrence.type === "weekly") {
        // Weekly on the same day of week
        shouldCreate = currentDate.getDay() === startDate.getDay();
      } else if (
        recurrence.type === "custom" &&
        recurrence.daysOfWeek?.length > 0
      ) {
        // Custom days of week
        shouldCreate = recurrence.daysOfWeek.includes(currentDate.getDay());
      }

      if (shouldCreate) {
        tasksToCreate.push({
          content,
          category,
          date: new Date(currentDate),
          userId: id,
          isRecurring: true,
          recurrence,
          isShared: isShared || false,
        });
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Bulk create all recurring task instances
    const tasks = await Task.insertMany(tasksToCreate);

    return res
      .status(201)
      .json(
        new ApiResponse(
          true,
          `${tasks.length} recurring tasks created successfully`,
          tasks,
        ),
      );
  } else {
    // Create single task
    const task = await Task.create({
      content,
      category,
      date: taskDate,
      userId: id,
      isRecurring: false,
      isShared: Boolean(isShared),
    });

    return res
      .status(201)
      .json(new ApiResponse(true, "Task created successfully", task));
  }
});

const updateTaskStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isCompleted } = req.body;

  const task = await Task.findById(id);

  if (!task) {
    return res.status(404).json(new ApiResponse(false, "Task not found"));
  }

  // Authorization
  const user = await userModel.findById(req.user.id);
  const isOwner = task.userId.toString() === req.user.id;
  const isPartnerOfSharedTask =
    task.isShared &&
    user.partnerId &&
    task.userId.toString() === user.partnerId.toString();

  if (!isOwner && !isPartnerOfSharedTask) {
    return res
      .status(403)
      .json(new ApiResponse(false, "Not authorized to update this task"));
  }

  task.isCompleted = isCompleted;
  await task.save();

  if (isCompleted) {
    // Run in background without awaiting to speed up response
    Promise.all([
      checkAndUpdateStreak(req.user.id, task.date),
      sendCompletionNotifications(req.user.id, task),
    ]).catch((err) => console.error("Background Effect Error:", err));
  }

  return res
    .status(200)
    .json(new ApiResponse(true, "Task updated successfully", task));
});

const getDashboard = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { date, viewMode = "daily" } = req.query;

  const user = await userModel.findById(id);
  if (!user)
    return res.status(404).json(new ApiResponse(false, "User not found"));

  const queryDate = date ? new Date(date) : new Date();

  let startOfRange, endOfRange;

  // Calculate date range based on view mode
  if (viewMode === "weekly") {
    // Get start of week (Sunday)
    startOfRange = new Date(queryDate);
    startOfRange.setDate(queryDate.getDate() - queryDate.getDay());
    startOfRange.setHours(0, 0, 0, 0);

    // Get end of week (Saturday)
    endOfRange = new Date(startOfRange);
    endOfRange.setDate(startOfRange.getDate() + 6);
    endOfRange.setHours(23, 59, 59, 999);
  } else if (viewMode === "monthly") {
    // Get start of month
    startOfRange = new Date(queryDate.getFullYear(), queryDate.getMonth(), 1);
    startOfRange.setHours(0, 0, 0, 0);

    // Get end of month
    endOfRange = new Date(queryDate.getFullYear(), queryDate.getMonth() + 1, 0);
    endOfRange.setHours(23, 59, 59, 999);
  } else {
    // Daily view (default)
    startOfRange = new Date(queryDate.setHours(0, 0, 0, 0));
    endOfRange = new Date(queryDate.setHours(23, 59, 59, 999));
  }

  // Sorting: Daily uses manual position, others use date then position
  const sortCriteria =
    viewMode === "daily"
      ? { position: 1, createdAt: -1 }
      : { date: 1, position: 1 };

  // Fetch user's own tasks for the date range
  const myTasks = await Task.find({
    userId: id,
    isShared: { $ne: true },
    date: { $gte: startOfRange, $lte: endOfRange },
  }).sort(sortCriteria);

  let partnerTasks = [];
  let partner = null;
  let sharedTasks = [];

  if (user.partnerId) {
    partnerTasks = await Task.find({
      userId: user.partnerId,
      isShared: { $ne: true },
      date: { $gte: startOfRange, $lte: endOfRange },
    }).sort(sortCriteria);

    // Fetch shared tasks (Common Goals)
    sharedTasks = await Task.find({
      isShared: true,
      $or: [{ userId: id }, { userId: user.partnerId }],
      date: { $gte: startOfRange, $lte: endOfRange },
    }).sort({ createdAt: -1 });

    // Fetch partner details
    const partnerUser = await userModel
      .findById(user.partnerId)
      .select("name email streak");
    if (partnerUser) {
      partner = partnerUser;
    }
  }

  return res.status(200).json(
    new ApiResponse(true, "Dashboard fetched successfully", {
      myTasks,
      partnerTasks,
      partner,
      sharedTasks,
      viewMode,
      dateRange: { start: startOfRange, end: endOfRange },
    }),
  );
});

const updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content, category } = req.body;

  const task = await Task.findOne({ _id: id, userId: req.user.id });

  if (!task) {
    return res
      .status(404)
      .json(new ApiResponse(false, "Task not found or unauthorized"));
  }

  if (content) task.content = content;
  if (category) task.category = category;
  if (req.body.hasOwnProperty("isRecurring")) {
    task.isRecurring = req.body.isRecurring;

    // If stopping recurrence, delete future identical recurring tasks
    if (req.body.isRecurring === false) {
      await Task.deleteMany({
        userId: req.user.id,
        content: task.content,
        isRecurring: true,
        date: { $gt: task.date },
      });
    }
  }
  if (req.body.hasOwnProperty("recurrence"))
    task.recurrence = req.body.recurrence;

  await task.save();

  return res
    .status(200)
    .json(new ApiResponse(true, "Task updated successfully", task));
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

  // --- Notification Logic ---
  try {
    const sender = await userModel.findById(userId);
    let recipientId = null;

    if (task.userId.toString() !== userId) {
      // If commenting on someone else's task, notify them
      recipientId = task.userId;
    } else if (task.isShared && sender.partnerId) {
      // If commenting on my own shared task, notify partner
      recipientId = sender.partnerId;
    }

    if (recipientId) {
      const recipient = await userModel.findById(recipientId);
      if (recipient && recipient.email) {
        const emailHtml = getEmailTemplate({
          title: `New Comment from ${sender.name} 💬`,
          body: `
            <p><span class="highlight">${sender.name}</span> commented on a task:</p>
            <div class="task-card">
              <p class="task-content">"${task.content}"</p>
              <hr style="border: 0; border-top: 1px solid #334155; margin: 10px 0;" />
              <p style="font-style: italic; color: #a5b4fc;">"${text}"</p>
            </div>
            <div style="text-align: center; margin-top: 30px;">
               <a href="${process.env.FRONTEND_URL || "#"}" class="cta-button">Reply</a>
            </div>
          `,
          footerText: "Collaboration is key! 🔑",
        });

        await sendEmail({
          to: recipient.email,
          subject: `💬 ${sender.name} commented on a task`,
          html: emailHtml,
        });
      }
    }
  } catch (err) {
    console.error("Comment notification failed:", err);
  }

  return res
    .status(200)
    .json(new ApiResponse(true, "Comment added successfully", task));
});

const addSubtask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json(new ApiResponse(false, "Content is required"));
  }

  const task = await Task.findById(id);
  if (!task)
    return res.status(404).json(new ApiResponse(false, "Task not found"));

  task.subtasks.push({ content, isCompleted: false });
  await task.save();

  return res.status(200).json(new ApiResponse(true, "Subtask added", task));
});

const toggleSubtask = asyncHandler(async (req, res) => {
  const { id, subtaskId } = req.params;

  const task = await Task.findById(id);
  if (!task)
    return res.status(404).json(new ApiResponse(false, "Task not found"));

  const subtask = task.subtasks.id(subtaskId);
  if (!subtask)
    return res.status(404).json(new ApiResponse(false, "Subtask not found"));

  subtask.isCompleted = !subtask.isCompleted;

  // Auto-complete parent task if all subtasks are done
  const allSubtasksCompleted = task.subtasks.every((sub) => sub.isCompleted);
  let parentStatusChanged = false;

  if (allSubtasksCompleted && task.subtasks.length > 0) {
    if (!task.isCompleted) {
      task.isCompleted = true;
      parentStatusChanged = true;
    }
  } else if (!allSubtasksCompleted && task.isCompleted) {
    // If we unchecked a subtask, and parent was completed, uncomplete parent
    task.isCompleted = false;
  }

  await task.save();

  if (parentStatusChanged && task.isCompleted) {
    // Run in background without awaiting to speed up response
    Promise.all([
      checkAndUpdateStreak(req.user.id, task.date),
      sendCompletionNotifications(req.user.id, task),
    ]).catch((err) => console.error("Background Effect Error:", err));
  }

  return res.status(200).json(new ApiResponse(true, "Subtask updated", task));
});

const deleteSubtask = asyncHandler(async (req, res) => {
  const { id, subtaskId } = req.params;

  const task = await Task.findById(id);
  if (!task)
    return res.status(404).json(new ApiResponse(false, "Task not found"));

  task.subtasks = task.subtasks.filter(
    (sub) => sub._id.toString() !== subtaskId,
  );
  await task.save();

  return res.status(200).json(new ApiResponse(true, "Subtask deleted", task));
});

export {
  createTask,
  updateTask,
  updateTaskStatus,
  getDashboard,
  deleteTask,
  addTaskComment,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
};
