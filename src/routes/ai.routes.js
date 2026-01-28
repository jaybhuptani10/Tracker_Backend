import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getInsights,
  parseTask,
  categorizeExpense,
} from "../controllers/ai.controller.js";

const router = Router();

router.use(verifyJWT);

router.get("/insights", getInsights);
router.post("/parse-task", parseTask);
router.post("/categorize-expense", categorizeExpense);

export default router;
