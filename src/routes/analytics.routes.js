import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getUserHeatmap,
  getCategoryDistribution,
  getPartnerStats,
  getTimeAnalytics,
} from "../controllers/analytics.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/heatmap").get(getUserHeatmap);
router.route("/categories").get(getCategoryDistribution);
router.route("/partner-stats").get(getPartnerStats);
router.route("/time-stats").get(getTimeAnalytics);

export default router;
