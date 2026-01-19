import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  createHabit,
  getHabits,
  toggleHabitDate,
  deleteHabit,
} from "../controllers/habit.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createHabit).get(getHabits);
router.route("/:id/toggle").post(toggleHabitDate);
router.route("/:id").delete(deleteHabit);

export default router;
