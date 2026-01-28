import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getJournals,
  createJournal,
  updateJournal,
  deleteJournal,
} from "../controllers/journal.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getJournals).post(createJournal);
router.route("/:id").patch(updateJournal).delete(deleteJournal);

export default router;
