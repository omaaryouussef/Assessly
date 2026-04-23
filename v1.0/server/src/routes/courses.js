import { Router } from "express";

// import {
//     createCourse,
//     deleteCourse,
//     getCourseById,
//     getCourses,
//     joinCourse,
//     updateCourse,
//     addStudenttoCourse,
//     removeStudentfromCourse,
//     getCoursesByUserId,
//     getCourseStudents,
// } from "../handlers/courses.js";
// import { authenticate } from "../middleware/auth.js";

const coursesRouter = Router();

// TODO: Add authentication middleware
// coursesRouter.use(authenticate);

// coursesRouter.get("/", authenticate, getCourses);
// coursesRouter.get("/:id", authenticate, getCourseById);
// coursesRouter.post("/", authenticate, createCourse);
// coursesRouter.put("/:id", authenticate, updateCourse);
// coursesRouter.delete("/:id", authenticate, deleteCourse);
// coursesRouter.get("/user/:userId", authenticate, getCoursesByUserId);

// coursesRouter.post("/join", authenticate, joinCourse); //self-enroll

// coursesRouter.post("/add", authenticate, addStudenttoCourse);
// coursesRouter.post("/remove", authenticate, removeStudentfromCourse);

// coursesRouter.get("/coursestudents/:courseId", authenticate, getCourseStudents);

export default coursesRouter;
