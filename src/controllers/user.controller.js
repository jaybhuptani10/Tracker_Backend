import asyncHandler from "../utils/asynchandler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/apiresponse.js";
import userModel from "../models/user.model.js";
import PartnerRequest from "../models/partnerRequest.model.js";
import { sendEmail } from "../utils/mailer.js";
import { getEmailTemplate } from "../utils/emailTemplate.js";
import { cloudinary } from "../config/multer.js";
import { Task } from "../models/task.model.js";
import { WorkSession } from "../models/workSession.model.js";

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
        {
          email: userDoc.email,
          id: userDoc._id,
          name: userDoc.name,
          isAdmin: userDoc.isAdmin,
        },
        process.env.JWT_SECRET,
        { expiresIn: "365d" }, // Set to 1 year
        (err, token) => {
          if (err) throw err;
          res
            .cookie("token", token, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
              maxAge: 365 * 24 * 60 * 60 * 1000, // 1 Year in milliseconds
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
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password",
    });
  }
});

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
  res
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
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

      // Calculate user stats
      const completedTasks = await Task.countDocuments({
        userId: user._id,
        isCompleted: true,
      });

      console.log(`Debug Stats for User ${user._id}:`);
      console.log(`- Completed Tasks Found: ${completedTasks}`);

      const workSessions = await WorkSession.find({ userId: user._id });
      console.log(`- Work Sessions Found: ${workSessions.length}`);

      let totalFocusSeconds = 0;

      workSessions.forEach((session) => {
        let sessionTotal = session.totalSeconds;

        // If this session is currently running, add the elapsed time since last start
        if (session.isRunning && session.lastStartTime) {
          const elapsed = Math.floor(
            (Date.now() - new Date(session.lastStartTime).getTime()) / 1000,
          );
          sessionTotal += Math.max(0, elapsed);
          console.log(
            `  > Running Session ${session._id}: Base ${session.totalSeconds}s + Elapsed ${elapsed}s = ${sessionTotal}s`,
          );
        } else {
          console.log(`  > Saved Session ${session._id}: ${sessionTotal}s`);
        }

        totalFocusSeconds += sessionTotal;
      });

      const totalFocusHours = (totalFocusSeconds / 3600).toFixed(1);
      console.log(`- Total Focus Hours: ${totalFocusHours}`);

      const { name, email, _id, partnerId, avatar, streak, createdAt } = user;
      res.json({
        success: true,
        user: {
          name,
          email,
          _id,
          partnerId,
          avatar,
          streak,
          createdAt,
          stats: {
            completedTasks,
            totalFocusHours: parseFloat(totalFocusHours),
          },
          highestStreak: user.highestStreak || 0, // Ensure backward compatibility
        },
      });
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

    // --- Add Stats Logic ---
    const completedTasks = await Task.countDocuments({
      userId: user._id,
      isCompleted: true,
    });

    const workSessions = await WorkSession.find({ userId: user._id });
    let totalFocusSeconds = 0;

    workSessions.forEach((session) => {
      let sessionTotal = session.totalSeconds;
      // If this session is currently running, add the elapsed time since last start
      if (session.isRunning && session.lastStartTime) {
        const elapsed = Math.floor(
          (Date.now() - new Date(session.lastStartTime).getTime()) / 1000,
        );
        sessionTotal += Math.max(0, elapsed);
      }
      totalFocusSeconds += sessionTotal;
    });

    const totalFocusHours = (totalFocusSeconds / 3600).toFixed(1);

    const userWithStats = {
      ...user.toObject(),
      stats: {
        completedTasks,
        totalFocusHours: parseFloat(totalFocusHours),
      },
    };
    // -----------------------

    res.json({ success: true, user: userWithStats });
  });
});

// Send Partner Request
const sendPartnerRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { id } = req.user;

  if (!email) {
    return res.status(400).json(new ApiResponse(false, "Email is required"));
  }

  const recipient = await userModel.findOne({ email: email.toLowerCase() });
  if (!recipient) {
    return res.status(404).json(new ApiResponse(false, "User not found"));
  }

  if (recipient._id.toString() === id) {
    return res
      .status(400)
      .json(new ApiResponse(false, "You cannot link with yourself"));
  }

  if (recipient.partnerId) {
    return res
      .status(400)
      .json(new ApiResponse(false, "User is already partnered"));
  }

  // Check existing request
  const existingRequest = await PartnerRequest.findOne({
    requesterId: id,
    recipientId: recipient._id,
    status: "pending",
  });

  if (existingRequest) {
    return res.status(400).json(new ApiResponse(false, "Request already sent"));
  }

  // Create Request
  await PartnerRequest.create({
    requesterId: id,
    recipientId: recipient._id,
  });

  // Send Email
  const currentUser = await userModel.findById(id);
  const emailHtml = getEmailTemplate({
    title: `Partner Request from ${currentUser.name}`,
    body: `
      <p>${currentUser.name} wants to be your accountability partner on DuoTrack!</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">Accept Request</a>
      </div>
    `,
    footerText: "Build habits together!",
  });

  await sendEmail({
    to: recipient.email,
    subject: `Partner Request from ${currentUser.name}`,
    html: emailHtml,
  });

  // Real-time notification
  const io = req.app.get("io");
  if (io) {
    io.to(recipient._id.toString()).emit("receive_request", {
      requester: { name: currentUser.name },
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(true, "Partner request sent successfully"));
});

// Get Pending Requests
const getPartnerRequests = asyncHandler(async (req, res) => {
  const { id } = req.user;
  const requests = await PartnerRequest.find({
    recipientId: id,
    status: "pending",
  }).populate("requesterId", "name email");

  return res
    .status(200)
    .json(new ApiResponse(true, "Requests fetched", requests));
});

// Respond to Request
const respondToPartnerRequest = asyncHandler(async (req, res) => {
  const { requestId, action } = req.body; // action: 'accept' or 'reject'
  const { id } = req.user;

  const request = await PartnerRequest.findById(requestId);
  if (!request) {
    return res.status(404).json(new ApiResponse(false, "Request not found"));
  }

  if (request.recipientId.toString() !== id) {
    return res.status(403).json(new ApiResponse(false, "Unauthorized"));
  }

  if (action === "accept") {
    // Update both users
    await userModel.findByIdAndUpdate(request.requesterId, {
      partnerId: id,
    });
    await userModel.findByIdAndUpdate(id, {
      partnerId: request.requesterId,
    });

    // Delete this request and any conflicting ones
    await PartnerRequest.deleteMany({
      $or: [
        { requesterId: id },
        { recipientId: id },
        { requesterId: request.requesterId },
        { recipientId: request.requesterId },
      ],
    });

    // Notify Requester
    const recipientUser = await userModel.findById(id);
    const requesterUser = await userModel.findById(request.requesterId);

    const emailHtml = getEmailTemplate({
      title: `Request Accepted! 🎉`,
      body: `
        <p>${recipientUser.name} accepted your partner request!</p>
        <p>You can now track goals together.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">Go to Dashboard</a>
        </div>
      `,
      footerText: "Let's go!",
    });

    await sendEmail({
      to: requesterUser.email,
      subject: `Partner Request Accepted!`,
      html: emailHtml,
    });

    // Real-time notification
    const io = req.app.get("io");
    if (io) {
      // Notify requester (who sent the request)
      io.to(request.requesterId.toString()).emit("request_accepted", {
        partner: { name: recipientUser.name },
      });
      // Notify recipient (current user, just in case they have multiple tabs)
      io.to(id.toString()).emit("request_accepted", {
        partner: { name: requesterUser.name },
      });
    }

    return res
      .status(200)
      .json(new ApiResponse(true, "Partner request accepted"));
  } else {
    // Reject
    await PartnerRequest.findByIdAndDelete(requestId);
    return res
      .status(200)
      .json(new ApiResponse(true, "Partner request rejected"));
  }
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

// Upload Image (Generic)
const uploadImage = asyncHandler(async (req, res) => {
  console.log("--> uploadImage controller entered");
  const file = req.file || (req.files && req.files[0]);

  if (!file) {
    console.log("No file received in request");
    return res.status(400).json(new ApiResponse(false, "No file uploaded"));
  }

  console.log(
    `Processing file: ${file.originalname}, Size: ${file.size} bytes, Type: ${file.mimetype}`,
  );

  try {
    // Ensure Cloudinary is configured
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    console.log("Starting Cloudinary upload stream...");

    // Upload to Cloudinary using buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "duotrack/moments",
          transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
          format: "jpg", // Convert to JPG to ensure compatibility (fixes stuck HEIC uploads)
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Stream Error:", error);
            reject(error);
          } else {
            console.log("Cloudinary Upload Success:", result.secure_url);
            resolve(result);
          }
        },
      );
      uploadStream.end(file.buffer);
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Cloudinary upload catch block:", error);
    return res
      .status(500)
      .json(new ApiResponse(false, "Failed to upload image"));
  }
});

// Upload Avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  const { id } = req.user;

  if (!req.file) {
    return res.status(400).json(new ApiResponse(false, "No file uploaded"));
  }

  try {
    // Ensure Cloudinary is configured
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Upload to Cloudinary using buffer
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "duotrack/avatars",
          transformation: [
            { width: 500, height: 500, crop: "fill", quality: "auto" },
          ],
          format: "jpg", // Convert HEIC and other formats to JPG for browser compatibility
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(req.file.buffer);
    });

    // Update user with avatar URL
    const user = await userModel
      .findByIdAndUpdate(id, { avatar: result.secure_url }, { new: true })
      .select("-password");

    return res.status(200).json(
      new ApiResponse(true, "Avatar uploaded successfully", {
        avatar: user.avatar,
      }),
    );
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return res
      .status(500)
      .json(new ApiResponse(false, "Failed to upload avatar"));
  }
});

export {
  logoutUser,
  loginUser,
  userProfile,
  registerUser,
  validateToken,
  sendPartnerRequest,
  getPartnerRequests,
  respondToPartnerRequest,
  unlinkPartner,
  sendNudge,
  markNudgeSeen,
  uploadAvatar,
  uploadImage,
};
