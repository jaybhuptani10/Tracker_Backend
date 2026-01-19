import asyncHandler from "../utils/asynchandler.js";
import { Task } from "../models/task.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

// @desc    Get user activity heatmap (completed tasks last 365 days)
// @route   GET /api/v1/analytics/heatmap
// @access  Private
export const getUserHeatmap = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);
  const today = new Date();
  const oneYearAgo = new Date(today.setFullYear(today.getFullYear() - 1));

  const tasks = await Task.aggregate([
    {
      $match: {
        userId: userId,
        isCompleted: true,
        updatedAt: { $gte: oneYearAgo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Transform to simpler array format
  const data = tasks.map((t) => ({ date: t._id, count: t.count }));

  res.status(200).json({ success: true, data });
});

// @desc    Get task category distribution
// @route   GET /api/v1/analytics/categories
// @access  Private
export const getCategoryDistribution = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user.id);

  const distribution = await Task.aggregate([
    {
      $match: {
        userId: userId,
        // We can choose to show ALL tasks or just completed.
        // Showing all gives a better picture of "what takes up my life"
      },
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const data = distribution.map((d) => ({ name: d._id, value: d.count }));

  res.status(200).json({ success: true, data });
});

// @desc    Get partner comparison stats (last 7 days)
// @route   GET /api/v1/analytics/partner-stats
// @access  Private
export const getPartnerStats = asyncHandler(async (req, res) => {
  const userIdStr = req.user.id;
  const userId = new mongoose.Types.ObjectId(userIdStr);

  // Find user to check partner
  const user = await User.findById(userIdStr);
  const partnerId = user.partnerId;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 6); // Last 7 days including today
  startDate.setHours(0, 0, 0, 0);

  // Match condition for both user and partner
  const userIds = [userId];
  if (partnerId) userIds.push(partnerId);

  const stats = await Task.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        isCompleted: true,
        updatedAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          user: "$userId",
          date: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Prepare 7-day structure
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

    // Find stats for this day
    const userCount =
      stats.find(
        (s) =>
          s._id.date === dateStr && s._id.user.toString() === userId.toString(),
      )?.count || 0;

    const partnerCount = partnerId
      ? stats.find(
          (s) =>
            s._id.date === dateStr &&
            s._id.user.toString() === partnerId.toString(),
        )?.count || 0
      : 0;

    last7Days.push({
      date: dateStr,
      day: dayName,
      You: userCount,
      Partner: partnerCount,
    });
  }

  res
    .status(200)
    .json({ success: true, data: last7Days, hasPartner: !!partnerId });
});

// @desc    Get time analytics (work sessions)
// @route   GET /api/v1/analytics/time-stats
// @access  Private
export const getTimeAnalytics = asyncHandler(async (req, res) => {
  const userIdStr = req.user.id;
  const userId = new mongoose.Types.ObjectId(userIdStr);

  // Find user to check partner
  const user = await User.findById(userIdStr);
  const partnerId = user.partnerId;

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 29); // Last 30 days
  startDate.setHours(0, 0, 0, 0);

  // Import WorkSession model
  const { WorkSession } = await import("../models/workSession.model.js");

  // Match condition for both user and partner
  const userIds = [userId];
  if (partnerId) userIds.push(partnerId);

  const sessions = await WorkSession.aggregate([
    {
      $match: {
        userId: { $in: userIds },
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          user: "$userId",
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        },
        totalSeconds: { $sum: "$totalSeconds" },
      },
    },
  ]);

  // Prepare 30-day structure
  const last30Days = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);

    // Use local date components to avoid timezone shifts
    // e.g. Jan 19 00:00 IST -> Jan 18 18:30 UTC. toISOString gives Jan 18.
    // We want "2026-01-19" to match the database's local-aligned or UTC-noon date.
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const dayName = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    // Find sessions for this day
    const userSeconds =
      sessions.find(
        (s) =>
          s._id.date === dateStr && s._id.user.toString() === userId.toString(),
      )?.totalSeconds || 0;

    const partnerSeconds = partnerId
      ? sessions.find(
          (s) =>
            s._id.date === dateStr &&
            s._id.user.toString() === partnerId.toString(),
        )?.totalSeconds || 0
      : 0;

    last30Days.push({
      date: dayName,
      You: parseFloat((userSeconds / 3600).toFixed(2)), // Convert to hours
      Partner: parseFloat((partnerSeconds / 3600).toFixed(2)),
    });
  }

  // Calculate totals
  const userTotal = sessions
    .filter((s) => s._id.user.toString() === userId.toString())
    .reduce((acc, s) => acc + s.totalSeconds, 0);

  const partnerTotal = partnerId
    ? sessions
        .filter((s) => s._id.user.toString() === partnerId.toString())
        .reduce((acc, s) => acc + s.totalSeconds, 0)
    : 0;

  res.status(200).json({
    success: true,
    data: {
      dailyData: last30Days,
      userTotalHours: parseFloat((userTotal / 3600).toFixed(2)),
      partnerTotalHours: parseFloat((partnerTotal / 3600).toFixed(2)),
      hasPartner: !!partnerId,
    },
  });
});
