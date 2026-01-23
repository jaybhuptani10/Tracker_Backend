import { Router } from "express";
import { triggerDailyReminders } from "../controllers/cron.controller.js";

const router = Router();

// Route: POST /api/v1/cron/reminders?secret=duotrack_reminder_secret
router.post("/reminders", triggerDailyReminders);
router.get("/reminders", triggerDailyReminders); // Allow GET for easier testing/browser triggering

export default router;
