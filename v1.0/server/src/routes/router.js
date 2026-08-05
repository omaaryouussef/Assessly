import { Router } from "express";

import usersRouter from "./users.js";
import coursesRouter from "./courses.js";
import assessmentsRouter from "./assessments.js";
import adminRouter from "./admin.js";

const router = Router();

router.use("/users", usersRouter);
router.use("/courses", coursesRouter);
router.use("/assessments", assessmentsRouter);
router.use("/admin", adminRouter);

export default router;
