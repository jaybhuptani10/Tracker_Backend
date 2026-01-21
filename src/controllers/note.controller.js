import { Note } from "../models/note.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

import userModel from "../models/user.model.js";

const getNote = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { type = "SHARED" } = req.query; // SHARED or PERSONAL

  // Fetch fresh user data
  const user = await userModel.findById(id);
  if (!user)
    return res.status(404).json(new ApiResponse(false, "User not found"));

  let query = {};
  let updateData = {};

  if (type === "PERSONAL") {
    query = { users: { $all: [id], $size: 1 }, type: "PERSONAL" };
    updateData = { users: [id], type: "PERSONAL", content: "" };
  } else {
    // SHARED
    if (!user.partnerId) {
      return res
        .status(400)
        .json(
          new ApiResponse(false, "You need a partner to have a shared note"),
        );
    }
    const partnerId = user.partnerId;
    query = { users: { $all: [id, partnerId] }, type: "SHARED" };
    updateData = { users: [id, partnerId], type: "SHARED", content: "" };
  }

  let note = await Note.findOne(query);

  if (!note) {
    note = await Note.create(updateData);
  }

  return res.status(200).json(new ApiResponse(true, "Note fetched", note));
});

const updateNote = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { content, type = "SHARED" } = req.body;

  const user = await userModel.findById(id);
  if (!user)
    return res.status(404).json(new ApiResponse(false, "User not found"));

  let query = {};

  if (type === "PERSONAL") {
    query = { users: { $all: [id], $size: 1 }, type: "PERSONAL" };
  } else {
    // SHARED
    if (!user.partnerId) {
      return res.status(400).json(new ApiResponse(false, "No partner linked"));
    }
    const partnerId = user.partnerId;
    query = { users: { $all: [id, partnerId] }, type: "SHARED" };
  }

  const note = await Note.findOneAndUpdate(
    query,
    {
      $set: {
        content,
        lastUpdatedBy: id,
      },
    },
    { new: true, upsert: true },
  );

  return res.status(200).json(new ApiResponse(true, "Note updated", note));
});

export { getNote, updateNote };
