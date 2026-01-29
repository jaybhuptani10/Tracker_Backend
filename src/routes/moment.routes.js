import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getMoments,
  createMoment,
  deleteMoment,
} from "../controllers/moment.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getMoments).post(createMoment);
router.route("/:id").delete(deleteMoment);

export default router;
