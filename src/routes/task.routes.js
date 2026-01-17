import { Router } from "express";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  getDashboard,
  deleteTask,
  addTaskComment,
} from "../controllers/task.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const taskRouter = Router();

taskRouter.use(verifyJWT); // Protect all task routes

taskRouter.route("/").post(createTask);
taskRouter.route("/dashboard").get(getDashboard);
taskRouter.route("/:id").patch(updateTask);
taskRouter.route("/:id/status").patch(updateTaskStatus);
taskRouter.route("/:id").delete(deleteTask);
taskRouter.route("/:id/comment").post(addTaskComment);

export default taskRouter;
