import { Router } from "express";
import {
  createInstructorInvite,
  listInstructorInvites,
  deleteInstructorInvite,
} from "../handlers/adminHandlers.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";

const adminRouter = Router();

adminRouter.use(authenticate, authorize("ADMIN"));
adminRouter.post("/invites", createInstructorInvite);
adminRouter.get("/invites", listInstructorInvites);
adminRouter.delete("/invites/:id", deleteInstructorInvite);

export default adminRouter;
