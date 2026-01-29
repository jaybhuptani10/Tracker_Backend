import { Moment } from "../models/moment.model.js";
import User from "../models/user.model.js";

export const getMoments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const partnerId = user.partnerId;

    // Find moments created by user OR their partner
    const query = {
      $or: [{ userId: req.user.id }],
    };

    if (partnerId) {
      query.$or.push({ userId: partnerId, isShared: true });
    }

    const moments = await Moment.find(query).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      data: moments,
    });
  } catch (error) {
    console.error("Get Moments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch moments",
    });
  }
};

export const createMoment = async (req, res) => {
  try {
    const { title, description, date, category, location, icon, image } =
      req.body;

    const moment = await Moment.create({
      userId: req.user.id,
      title,
      description,
      date,
      category,
      location,
      icon,
      image,
      isShared: true,
    });

    return res.status(201).json({
      success: true,
      data: moment,
      message: "Moment added successfully",
    });
  } catch (error) {
    console.error("Create Moment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create moment",
    });
  }
};

export const deleteMoment = async (req, res) => {
  try {
    const { id } = req.params;
    const moment = await Moment.findById(id);

    if (!moment) {
      return res.status(404).json({
        success: false,
        message: "Moment not found",
      });
    }

    // Allow deletion if user owns it
    if (moment.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own moments",
      });
    }

    await Moment.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Moment deleted",
    });
  } catch (error) {
    console.error("Delete Moment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete moment",
    });
  }
};
