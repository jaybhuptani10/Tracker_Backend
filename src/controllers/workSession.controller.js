import { WorkSession } from "../models/workSession.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

// Get today's work session
const getTodaySession = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { date } = req.query;

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
      isRunning: false,
      sessions: [],
    });
  }

  // If timer was running, calculate elapsed time since last start
  if (session.isRunning && session.lastStartTime) {
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(session.lastStartTime).getTime()) / 1000,
    );
    session.totalSeconds += elapsedSeconds;
    session.lastStartTime = new Date();
    await session.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(true, "Session fetched successfully", session));
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
