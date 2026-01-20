import { Router } from "express";

import {
  loginUser,
  logoutUser,
  registerUser,
  userProfile,
  validateToken,
  sendPartnerRequest,
  getPartnerRequests,
  respondToPartnerRequest,
  unlinkPartner,
  sendNudge,
  markNudgeSeen,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();
userRouter.route("/register").post(registerUser);
userRouter.route("/login").post(loginUser);
userRouter.route("/logout").post(logoutUser);

// Partner Management
userRouter.route("/partner/request").post(verifyJWT, sendPartnerRequest);
userRouter.route("/partner/requests").get(verifyJWT, getPartnerRequests);
userRouter.route("/partner/respond").post(verifyJWT, respondToPartnerRequest);

userRouter.route("/unlink-partner").post(verifyJWT, unlinkPartner);
userRouter.route("/nudge").post(verifyJWT, sendNudge);
userRouter.route("/nudge/seen").post(verifyJWT, markNudgeSeen);
userRouter.route("/me").get(verifyJWT, validateToken);

export default userRouter;
