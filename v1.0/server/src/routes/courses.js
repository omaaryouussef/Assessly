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
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import {
    getCoursesByUserId,
    createCourse,
    updateCourse,
    deleteCourse,
    joinCourse,
} from "../handlers/courseHandlers.js";
const coursesRouter = Router();

// TODO: Add authentication middleware
// coursesRouter.use(authenticate);

coursesRouter.get("/", authenticate, getCoursesByUserId);
// coursesRouter.get("/:id", authenticate, getCourseById);
coursesRouter.post("/", authenticate, authorize("INSTRUCTOR"), createCourse);
coursesRouter.put("/:id", authenticate, authorize("INSTRUCTOR"), updateCourse);
coursesRouter.delete("/:id", authenticate, authorize("INSTRUCTOR"), deleteCourse);
// coursesRouter.get("/user/:userId", authenticate, getCoursesByUserId);
coursesRouter.post("/join", authenticate, authorize("STUDENT"), joinCourse); //self-enroll

// coursesRouter.post("/add", authenticate, addStudenttoCourse);
// coursesRouter.post("/remove", authenticate, removeStudentfromCourse);

// coursesRouter.get("/coursestudents/:courseId", authenticate, getCourseStudents);

export default coursesRouter;
