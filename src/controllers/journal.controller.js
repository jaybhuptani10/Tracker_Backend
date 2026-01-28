import asyncHandler from "../utils/asynchandler.js";
import { Journal } from "../models/journal.model.js";
import { ApiResponse } from "../utils/apiresponse.js";

// Get all journal entries for a user (with optional pagination/date filters)
const getJournals = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { limit = 20, page = 1 } = req.query;

  const skip = (page - 1) * limit;

  const journals = await Journal.find({ userId: id })
    .sort({ date: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Journal.countDocuments({ userId: id });

  return res.status(200).json(
    new ApiResponse(true, "Journals fetched successfully", {
      journals,
      total,
      hasMore: total > skip + journals.length,
    }),
  );
});

// Create a new journal entry
const createJournal = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { title, content, mood, date, tags } = req.body;

  if (!content) {
    return res.status(400).json(new ApiResponse(false, "Content is required"));
  }

  // Check if an entry already exists for this exact date (optional logic,
  // but usually users confuse "Daily Journal" with "Multiple entries per day".
  // Let's allow multiple for flexibility, or we can check date.)
  // For now, simple creation.

  const journal = await Journal.create({
    userId: id,
    title: title || "",
    content,
    mood: mood || "neutral",
    date: date || new Date(),
    tags: tags || [],
  });

  return res
    .status(201)
    .json(new ApiResponse(true, "Journal entry created", journal));
});

// Update an entry
const updateJournal = asyncHandler(async (req, res) => {
  const { id } = req.params; // Journal ID
  const { title, content, mood, tags } = req.body;
  const { id: userId } = req.user;

  const journal = await Journal.findOne({ _id: id, userId });

  if (!journal) {
    return res.status(404).json(new ApiResponse(false, "Entry not found"));
  }

  if (title !== undefined) journal.title = title;
  if (content !== undefined) journal.content = content;
  if (mood !== undefined) journal.mood = mood;
  if (tags !== undefined) journal.tags = tags;

  await journal.save();

  return res
    .status(200)
    .json(new ApiResponse(true, "Journal updated successfully", journal));
});

// Delete an entry
const deleteJournal = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { id: userId } = req.user;

  const journal = await Journal.findOneAndDelete({ _id: id, userId });

  if (!journal) {
    return res.status(404).json(new ApiResponse(false, "Entry not found"));
  }

  return res.status(200).json(new ApiResponse(true, "Journal entry deleted"));
});

export { getJournals, createJournal, updateJournal, deleteJournal };
