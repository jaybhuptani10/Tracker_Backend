import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../config/multer.js";
import { uploadImage } from "../controllers/user.controller.js";

const uploadRouter = Router();

uploadRouter.route("/").post(
  verifyJWT,
  (req, res, next) => {
    console.log("Starting Multer middleware...");
    const uploadMiddleware = upload.any();
    uploadMiddleware(req, res, (err) => {
      console.log("Multer finished. Error:", err);
      console.log("req.files:", req.files);
      console.log("req.body:", req.body);
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File is too large. Max limit is 10MB",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  uploadImage,
);

export default uploadRouter;
