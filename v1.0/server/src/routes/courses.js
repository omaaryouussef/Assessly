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
    getPeopleByCourseId,
    removeStudentfromCourse,
    addStudentToCourse,
    addTaToCourse,
    removeTaFromCourse,
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
coursesRouter.post("/join", authenticate, authorize("STUDENT", "TA"), joinCourse); //self-enroll

coursesRouter.post("/add/:courseId", authenticate, authorize("INSTRUCTOR"), addStudentToCourse);
coursesRouter.post("/add-ta/:courseId", authenticate, authorize("INSTRUCTOR"), addTaToCourse);
coursesRouter.delete("/remove/:courseId", authenticate, authorize("INSTRUCTOR"), removeStudentfromCourse);
coursesRouter.delete("/remove-ta/:courseId", authenticate, authorize("INSTRUCTOR"), removeTaFromCourse);
coursesRouter.get("/people/:courseId", authenticate, getPeopleByCourseId);

export default coursesRouter;
