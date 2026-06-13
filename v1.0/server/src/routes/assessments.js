import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getAssignmentsByCourseId,
  getQuizzesByCourseId,
  getExamsByCourseId,
  toggleAssessmentPublish,
  toggleAssessmentClose,
  deleteAssessment,
} from "../handlers/assessmentHandlers.js";
import { authorize } from "../middleware/authorize.js";

const assessmentsRouter = Router();

assessmentsRouter.get("/assignments/:courseId", authenticate, getAssignmentsByCourseId);
assessmentsRouter.get("/quizzes/:courseId", authenticate, getQuizzesByCourseId);
assessmentsRouter.get("/exams/:courseId", authenticate, getExamsByCourseId);
assessmentsRouter.patch(
  "/:assessmentId/publish",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  toggleAssessmentPublish,
);
assessmentsRouter.patch(
  "/:assessmentId/close",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  toggleAssessmentClose,
);
assessmentsRouter.delete("/:assessmentId", authenticate, authorize("INSTRUCTOR", "TA"), deleteAssessment);

export default assessmentsRouter;
