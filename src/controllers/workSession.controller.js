import { WorkSession } from "../models/workSession.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

// Get today's work session
// Helper to handle date rollover for running sessions
const handleSessionRollover = async (userId, targetDate) => {
  // Find ANY running session for this user
  const activeSession = await WorkSession.findOne({ userId, isRunning: true });
  if (!activeSession) return;

  const activeDate = new Date(activeSession.date);
  const targetDateObj = new Date(targetDate);

  // Normalize to YYYY-MM-DD for comparison
  const activeDateStr = activeDate.toISOString().split("T")[0];
  const targetDateStr = targetDateObj.toISOString().split("T")[0];

  // If the active session is from a DIFFERENT day than the one we are requesting (likely Yesterday -> Today)
  if (activeDateStr !== targetDateStr) {
    const now = new Date();

    // 1. Finalize the Old Session (Cap at 23:59:59 of that day)
    const endOfOldDay = new Date(activeSession.date);
    endOfOldDay.setHours(23, 59, 59, 999);

    // Calculate time spent in the old day
    // If lastStartTime was already after midnight? (Shouldn't happen if date logic holds, but standardizing)
    const lastStart = new Date(activeSession.lastStartTime);

    if (lastStart < endOfOldDay) {
      const durationInOldDay = Math.floor(
        (endOfOldDay.getTime() - lastStart.getTime()) / 1000,
      );
      activeSession.totalSeconds += Math.max(0, durationInOldDay);
      activeSession.sessions.push({
        startTime: lastStart,
        endTime: endOfOldDay,
        duration: durationInOldDay,
      });
    }

    activeSession.isRunning = false;
    activeSession.lastStartTime = null;
    await activeSession.save();

    // 2. Start/Resume the New Session (From 00:00:00 of target day to NOW)
    // Only if the target date matches "TODAY" (or closer to now).
    // We assume if we are rolling over, we are rolling into the NEW day.

    if (targetDateStr === now.toISOString().split("T")[0]) {
      const startOfNewDay = new Date(targetDate);
      startOfNewDay.setHours(0, 0, 0, 0);

      let newSession = await WorkSession.findOne({
        userId,
        date: {
          $gte: startOfNewDay,
          $lte: new Date(targetDateObj.getTime()).setHours(23, 59, 59, 999), // ensure matched properly
        },
      });

      if (!newSession) {
        newSession = await WorkSession.create({
          userId,
          date: startOfNewDay,
          totalSeconds: 0,
          isRunning: true,
          lastStartTime: startOfNewDay, // Effectively started at midnight
          sessions: [],
        });
      } else {
        newSession.isRunning = true;
        newSession.lastStartTime = startOfNewDay; // Reset anchor to midnight
      }

      // Calculate elapsed time in new day (Midnight to Now)
      const durationInNewDay = Math.floor(
        (now.getTime() - startOfNewDay.getTime()) / 1000,
      );
      newSession.totalSeconds += Math.max(0, durationInNewDay);
      // We set lastStartTime to NOW so subsequent updates calc diff from NOW
      newSession.lastStartTime = now;

      await newSession.save();
    }
  }
};

// Get today's work session
const getTodaySession = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const { date, userId } = req.query;

  // Use requested userId (for partner) or default to current user
  const targetUserId = userId || currentUserId;

  const queryDate = date ? new Date(date) : new Date();

  // Check for rollover BEFORE fetching specific session
  await handleSessionRollover(targetUserId, queryDate);

  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  let session = await WorkSession.findOne({
    userId: targetUserId,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (!session) {
    // Only create a new session if we are fetching our OWN session
    if (targetUserId === currentUserId) {
      session = await WorkSession.create({
        userId: currentUserId,
        date: startOfDay,
        totalSeconds: 0,
        isRunning: false,
        sessions: [],
      });
    } else {
      // For partner, if no session exists, return partial valid structure (not saved to DB)
      return res.status(200).json(
        new ApiResponse(true, "Partner session fetched", {
          totalSeconds: 0,
          isRunning: false,
        }),
      );
    }
  }

  // If timer was running, calculate elapsed time since last start
  // This logic must run for partner too so we see accurate current time!
  let currentTotalSeconds = session.totalSeconds;

  if (session.isRunning && session.lastStartTime) {
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(session.lastStartTime).getTime()) / 1000,
    );
    // Add elapsed time for display purposes only - DON'T save it yet
    currentTotalSeconds += elapsedSeconds;
  }

  // Return session with calculated total (not saved to DB yet)
  const responseData = {
    ...session.toObject(),
    totalSeconds: currentTotalSeconds,
  };

  return res
    .status(200)
    .json(new ApiResponse(true, "Session fetched successfully", responseData));
});

// Start/Resume timer
const startTimer = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { date } = req.body;

  const queryDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  let session = await WorkSession.findOne({
    userId: id,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (!session) {
    session = await WorkSession.create({
      userId: id,
      date: startOfDay,
      totalSeconds: 0,
      isRunning: true,
      lastStartTime: new Date(),
      sessions: [],
    });
  } else {
    session.isRunning = true;
    session.lastStartTime = new Date();
    await session.save();
  }

  return res.status(200).json(new ApiResponse(true, "Timer started", session));
});

// Pause timer
const pauseTimer = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { date } = req.body;

  const queryDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  const session = await WorkSession.findOne({
    userId: id,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (!session) {
    return res.status(404).json(new ApiResponse(false, "Session not found"));
  }

  if (session.isRunning && session.lastStartTime) {
    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - new Date(session.lastStartTime).getTime()) / 1000,
    );

    session.totalSeconds += duration;
    session.sessions.push({
      startTime: session.lastStartTime,
      endTime: endTime,
      duration: duration,
    });
    session.isRunning = false;
    session.lastStartTime = null;
    await session.save();
  }

  return res.status(200).json(new ApiResponse(true, "Timer paused", session));
});

// Reset timer for today
const resetTimer = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { date } = req.body;

  const queryDate = date ? new Date(date) : new Date();
  const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

  const session = await WorkSession.findOne({
    userId: id,
    date: { $gte: startOfDay, $lte: endOfDay },
  });

  if (session) {
    session.totalSeconds = 0;
    session.isRunning = false;
    session.lastStartTime = null;
    session.sessions = [];
    await session.save();
  }

  return res.status(200).json(new ApiResponse(true, "Timer reset", session));
});

export { getTodaySession, startTimer, pauseTimer, resetTimer };
