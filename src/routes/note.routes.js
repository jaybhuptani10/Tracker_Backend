import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getSharedNote,
  updateSharedNote,
} from "../controllers/note.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getSharedNote).patch(updateSharedNote);

export default router;
