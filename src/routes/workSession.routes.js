import { Router } from "express";
import {
  getTodaySession,
  startTimer,
  pauseTimer,
  resetTimer,
} from "../controllers/workSession.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const workSessionRouter = Router();

workSessionRouter.use(verifyJWT);

workSessionRouter.route("/").get(getTodaySession);
workSessionRouter.route("/start").post(startTimer);
workSessionRouter.route("/pause").post(pauseTimer);
workSessionRouter.route("/reset").post(resetTimer);

export default workSessionRouter;
