import { Router } from "express";

import {loginUser, getUser, createUser, googleCallback, completeGoogleProfile } from "../handlers/userHandlers.js";
import { authenticate } from "../middleware/authenticate.js";
import passport from "../auth/googleStrategy.js";

const usersRouter = Router();

usersRouter.post("/register", createUser);
usersRouter.post("/login", loginUser);
usersRouter.get("/user", authenticate, getUser);
usersRouter.get("/auth/google", passport.authenticate('google', { scope: ['profile', 'email'] }));
usersRouter.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/login?error=google_auth_failed`,
  }),
  googleCallback
);
usersRouter.post("/google/complete-profile", completeGoogleProfile);
// usersRouter.get("/:auc_Id", getUserById);

export default usersRouter;
