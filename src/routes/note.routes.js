import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getNote, updateNote } from "../controllers/note.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getNote).patch(updateNote);

export default router;
