import { Router } from "express";
// import { createExam, deleteExam, getExamById, getExams, getExamsByCourseId, updateExam } from "../handlers/exams.js"; // Ensure the path matches your project structure
// import { authenticate } from "../middleware/auth.js";

const assessmentsRouter = Router();

// Authentication middleware for protected routes
//assessmentsRouter.use(authenticate); // Apply to all routes if authentication is required

// Routes
// assessmentsRouter.get("/", getExams); // Fetch all exams
// assessmentsRouter.get("/:id", getExamById); // Fetch a single exam by ID
// assessmentsRouter.get("/course/:courseId", getExamsByCourseId); // Fetch exams by course ID
// assessmentsRouter.post("/", createExam); // Create a new exam (protected)
// assessmentsRouter.put("/:id", updateExam); // Update an exam by ID (protected)
// assessmentsRouter.delete("/:id", deleteExam); // Delete an exam by ID (protected)

export default assessmentsRouter;
