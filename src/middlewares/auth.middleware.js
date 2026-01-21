import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/apiresponse.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json(new ApiResponse(false, "Unauthorized request"));
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decodedToken; // { email, id, name, ... }
    next();
  } catch (error) {
    return res.status(401).json(new ApiResponse(false, "Invalid Access Token"));
  }
});

export const verifyAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json(new ApiResponse(false, "Admin access required"));
  }
};
