import asyncHandler from "../utils/asynchandler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/apiresponse.js";
import userModel from "../models/user.model.js";
import { sendEmail } from "../utils/mailer.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";

// Register User
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please fill all the fields");
  }
  const emailLower = email.toLowerCase();
  const existedUser = await userModel.findOne({ $or: [{ email: emailLower }] });
  if (existedUser) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }
  const newUser = await userModel.create({
    name,
    email: emailLower,
    password: bcrypt.hashSync(password, 10),
  });
  const createdUser = await userModel
    .findById(newUser._id)
    .select("-password -refreshToken");
  if (!createdUser) {
    return res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
  return res
    .status(201)
    .json(new ApiResponse(true, "User created successfully", createdUser));
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400);
    throw new Error("Please fill all the fields");
  }
  const emailLower = email.toLowerCase();
  const userDoc = await userModel.findOne({ email: emailLower });
  if (userDoc) {
    const pass = bcrypt.compareSync(password, userDoc.password);
    if (pass) {
      jwt.sign(
        { email: userDoc.email, id: userDoc._id, name: userDoc.name },
        process.env.JWT_SECRET,
        { expiresIn: "1d" },
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production", // Set secure to true in production
              sameSite: "None", // Required for cross-site cookies
            })
            .json({ token, user: userDoc }); // Include token in response
        },
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  }
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    })
    .json({
      message: "Logged out successfully",
    });
});

// User Profile
const userProfile = asyncHandler(async (req, res) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Not authorized, token missing",
      });
    }
    jwt.verify(token, process.env.JWT_SECRET, {}, async (err, userDoc) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: "Not authorized, token invalid",
          error: err.message,
        });
      }
      const user = await userModel.findById(userDoc.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }
      const { name, email, _id, partnerId } = user;
      res.json({ name, email, id: _id, partnerId });
    });
  } catch (e) {
    console.error("Server error:", e);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: e.message,
    });
  }
});
const validateToken = asyncHandler(async (req, res) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1]; // Get token from 'Authorization' header
  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, userDoc) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Token invalid" });
    }

    const user = await userModel.findById(userDoc.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user });
  });
});

// Link Partner
const linkPartner = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { id } = req.user; // Assuming auth middleware adds user to req

  if (!email) {
    return res.status(400).json(new ApiResponse(false, "Email is required"));
  }

  const partner = await userModel.findOne({ email: email.toLowerCase() });
  if (!partner) {
    return res.status(404).json(new ApiResponse(false, "User not found"));
  }

  if (partner._id.toString() === id) {
    return res
      .status(400)
      .json(new ApiResponse(false, "You cannot link with yourself"));
  }

  // Update current user
  await userModel.findByIdAndUpdate(id, { partnerId: partner._id });

  // Update partner (bidirectional link)
  await userModel.findByIdAndUpdate(partner._id, { partnerId: id });

  return res
    .status(200)
    .json(new ApiResponse(true, "Partner linked successfully"));
});

// Unlink Partner
const unlinkPartner = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const user = await userModel.findById(id);

  if (!user || !user.partnerId) {
    return res.status(400).json(new ApiResponse(false, "No partner linked"));
  }

  const partnerId = user.partnerId;

  // Unlink current user
  await userModel.findByIdAndUpdate(id, { $unset: { partnerId: "" } });

  // Unlink partner
  await userModel.findByIdAndUpdate(partnerId, { $unset: { partnerId: "" } });

  return res.json(new ApiResponse(true, "Partner unlinked successfully"));
});

// Send Nudge
const sendNudge = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const { id } = req.user;
  const user = await userModel.findById(id);

  if (!user.partnerId) {
    return res.status(400).json(new ApiResponse(false, "No partner linked"));
  }

  const partner = await userModel.findById(user.partnerId);
  if (!partner) {
    return res.status(404).json(new ApiResponse(false, "Partner not found"));
  }

  // Save nudge to partner's record
  await userModel.findByIdAndUpdate(partner._id, {
    lastNudge: {
      message,
      from: user.name,
      timestamp: new Date(),
      seen: false,
    },
  });

  // Send Email
  const emailHtml = getEmailTemplate({
    title: `👋 ${user.name} says...`,
    body: `
      <div style="text-align: center; font-size: 24px; font-weight: bold; color: #6366f1; margin: 30px 0;">
        "${message}"
      </div>
      <p style="text-align: center;">Open the app to reply!</p>
      <div style="text-align: center; margin-top: 30px;">
        <a href="${process.env.FRONTEND_URL}" class="cta-button">Open DuoTrack</a>
      </div>
    `,
    footerText: "Keep specific notifications enabled to see these instantly!",
  });

  await sendEmail({
    to: partner.email,
    subject: `👋 Nudge from ${user.name}: "${message}"`,
    html: emailHtml,
  });

  return res.status(200).json(new ApiResponse(true, "Nudge sent!"));
});

// Mark Nudge as Seen
const markNudgeSeen = asyncHandler(async (req, res) => {
  const { id } = req.user;
  await userModel.findByIdAndUpdate(id, { "lastNudge.seen": true });
  return res.status(200).json(new ApiResponse(true, "Nudge marked as seen"));
});

export {
  logoutUser,
  loginUser,
  userProfile,
  registerUser,
  validateToken,
  linkPartner,
  unlinkPartner,
  sendNudge,
  markNudgeSeen,
};
