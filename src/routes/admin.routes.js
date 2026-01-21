import { Router } from "express";
import {
  getDashboardStats,
  getAllUsers,
} from "../controllers/admin.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT); // Apply JWT verification to all routes
router.use(verifyAdmin); // Apply Admin check to all routes

router.get("/stats", getDashboardStats);
router.get("/users", getAllUsers);

export default router;
