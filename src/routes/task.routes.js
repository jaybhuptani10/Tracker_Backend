import { Router } from "express";
import {
  createTask,
  updateTask,
  updateTaskStatus,
  getDashboard,
  deleteTask,
  addTaskComment,
  addSubtask,
  toggleSubtask,
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
taskRouter.route("/:id/subtasks").post(addSubtask);
taskRouter.route("/:id/subtasks/:subtaskId").patch(toggleSubtask);

export default taskRouter;
