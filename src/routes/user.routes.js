import { Router } from "express";

import {
  loginUser,
  logoutUser,
  registerUser,
  userProfile,
  validateToken,
  linkPartner,
  unlinkPartner,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();
userRouter.route("/register").post(registerUser);
userRouter.route("/login").post(loginUser);
userRouter.route("/logout").post(logoutUser);
userRouter.route("/link-partner").post(verifyJWT, linkPartner);
userRouter.route("/unlink-partner").post(verifyJWT, unlinkPartner);
userRouter.route("/me").get(verifyJWT, validateToken);

export default userRouter;
