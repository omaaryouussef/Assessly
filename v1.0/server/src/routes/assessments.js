import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getAssignmentsByCourseId,
  getQuizzesByCourseId,
  getExamsByCourseId,
  toggleAssessmentPublish,
  toggleAssessmentClose,
  deleteAssessment,
  createAssessment,
  getAssessmentById,
  updateAssessment,
  submitAssessment,
  runCode,
  getAllAssessments,
  getAllAssessmentsForAllStudents,
  saveStudentGrades,
  getStudentAnswers,
  getQuestionsFeedback,
  saveQuestionGradesForStudent,
  upsertQuestionFeedback,
  resolveQuestionFeedback,
  getExamsByUserId,
  getQuizzesByUserId,
  getAssignmentsByUserId,
} from "../handlers/assessmentHandlers.js";
import {
  createProctoringEvent,
  getProctoringEvents,
} from "../handlers/proctoringHandlers.js";
import { authorize } from "../middleware/authorize.js";

const assessmentsRouter = Router();

assessmentsRouter.get(
  "/assignments/:courseId",
  authenticate,
  getAssignmentsByCourseId,
);
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
assessmentsRouter.delete(
  "/:assessmentId",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  deleteAssessment,
);

assessmentsRouter.post(
  "/:courseId",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  createAssessment,
);

assessmentsRouter.put(
  "/:assessmentId",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  updateAssessment,
);

assessmentsRouter.get(
  "/:assessmentId",
  authenticate,
  authorize("INSTRUCTOR", "TA", "STUDENT"),
  getAssessmentById,
);

assessmentsRouter.post(
  "/:assessmentId/submit",
  authenticate,
  authorize("STUDENT"),
  submitAssessment,
);

assessmentsRouter.post(
  "/:assessmentId/run-code",
  authenticate,
  authorize("STUDENT", "INSTRUCTOR", "TA"),
  runCode,
);

assessmentsRouter.get(
  "/all/:courseId",
  authenticate,
  authorize("STUDENT"),
  getAllAssessments,
);

assessmentsRouter.get(
  "/all-students/:courseId",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  getAllAssessmentsForAllStudents,
);

assessmentsRouter.patch(
  "/grades/:courseId",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  saveStudentGrades,
);

assessmentsRouter.patch(
  "/questions-feedback/:feedbackId/resolve",
  authenticate,
  authorize("INSTRUCTOR", "TA", "STUDENT"),
  resolveQuestionFeedback,
);

assessmentsRouter.get(
  "/:assessmentId/student-answers/:studentId",
  authenticate,
  authorize("INSTRUCTOR", "TA", "STUDENT"),
  getStudentAnswers,
);

assessmentsRouter.get(
  "/:assessmentId/questions-feedback/:studentId",
  authenticate,
  authorize("INSTRUCTOR", "TA", "STUDENT"),
  getQuestionsFeedback,
);

assessmentsRouter.post(
  "/:assessmentId/questions-feedback/:studentId",
  authenticate,
  authorize("INSTRUCTOR", "TA", "STUDENT"),
  upsertQuestionFeedback,
);

assessmentsRouter.patch(
  "/:assessmentId/question-grades/:studentId",
  authenticate,
  authorize("INSTRUCTOR", "TA"),
  saveQuestionGradesForStudent,
);

assessmentsRouter.post(
  "/:assessmentId/proctoring-events",
  authenticate,
  authorize("STUDENT"),
  createProctoringEvent,
);

assessmentsRouter.get(
  "/:assessmentId/proctoring-events",
  authenticate,
  authorize("INSTRUCTOR", "TA", "STUDENT"),
  getProctoringEvents,
);


assessmentsRouter.get(
  "/user/exams/",
  authenticate,
  authorize("STUDENT", "INSTRUCTOR", "TA"),
  getExamsByUserId,
);

assessmentsRouter.get(
  "/user/quizzes/",
  authenticate,
  authorize("STUDENT", "INSTRUCTOR", "TA"),
  getQuizzesByUserId,
);

assessmentsRouter.get(
  "/user/assignments/",
  authenticate,
  authorize("STUDENT", "INSTRUCTOR", "TA"),
  getAssignmentsByUserId,
);

export default assessmentsRouter;
