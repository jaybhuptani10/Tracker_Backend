import { Note } from "../models/note.model.js";
import { ApiResponse } from "../utils/apiresponse.js";
import asyncHandler from "../utils/asynchandler.js";

import userModel from "../models/user.model.js";

const getSharedNote = asyncHandler(async (req, res) => {
  const { id } = req.user;

  // Fetch fresh user data to get current partner
  const user = await userModel.findById(id);

  if (!user || !user.partnerId) {
    return res
      .status(400)
      .json(new ApiResponse(false, "You need a partner to have a shared note"));
  }

  const partnerId = user.partnerId;

  // Find note where users array contains both IDs
  let note = await Note.findOne({
    users: { $all: [id, partnerId] },
  });

  if (!note) {
    note = await Note.create({
      users: [id, partnerId],
      content: "",
    });
  }

  return res.status(200).json(new ApiResponse(true, "Note fetched", note));
});

const updateSharedNote = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const { content } = req.body;

  // Fetch fresh user data
  const user = await userModel.findById(id);

  if (!user || !user.partnerId) {
    return res.status(400).json(new ApiResponse(false, "No partner linked"));
  }

  const partnerId = user.partnerId;

  const note = await Note.findOneAndUpdate(
    { users: { $all: [id, partnerId] } },
    {
      $set: {
        content,
        lastUpdatedBy: id,
      },
    },
    { new: true, upsert: true }, // Create if not exists (though get should handle it)
  );

  return res.status(200).json(new ApiResponse(true, "Note updated", note));
});

export { getSharedNote, updateSharedNote };
