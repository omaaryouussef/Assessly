import { Router } from "express";

import {loginUser, getUser, createUser } from "../handlers/userHandlers.js";
import { authenticate } from "../middleware/authenticate.js";

const usersRouter = Router();

usersRouter.post("/register", createUser);
usersRouter.post("/login", loginUser);
usersRouter.get("/user", authenticate, getUser);
// usersRouter.get("/:auc_Id", getUserById);

export default usersRouter;
