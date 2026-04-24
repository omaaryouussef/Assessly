import React from "react";
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import ProtectedRoutes from "../components/auth/ProtectedRoutes";
import App from "../App";
import AssessmentFeedbackPage from "../pages/AssessmentFeedbackPage";
import AccountPage from "../pages/AccountPage";
import CourseHomePage from "../pages/CourseHomePage";
import HelpPage from "../pages/HelpPage";
import PeoplePage from "../pages/PeoplePage";
import SchedulePage from "../pages/SchedulePage";
import AllQuizzesPage from "../pages/AllQuizzesPage";
import AllExamsPage from "../pages/AllExamsPage";
import AllAssignmentsPage from "../pages/AllAssignmentsPage";
import AllCoursesPage from "../pages/AllCoursesPage";
import AddStudentPage from "../pages/Instructor/AddStudentPage";
import AssessmentStudioPage from "../pages/Instructor/AssessmentStudioPage";
import CreateCoursePage from "../pages/Instructor/CreateCoursePage";
import DeleteCoursePage from "../pages/Instructor/DeleteCoursePage";
import EditCoursePage from "../pages/Instructor/EditCoursePage";
import RemoveStudentPage from "../pages/Instructor/RemoveStudentPage";
import ViewAllStudentsGradePage from "../pages/Instructor/ViewAllStudentsGradePage";
import JoinCoursePage from "../pages/Student/JoinCoursePage";
import TakeAssessmentPage from "../pages/Student/TakeAssessmentPage";
import ViewGradesPage from "../pages/Student/ViewGradesPage";
import LoginView from "../pages/auth/LoginView";
// import RegisterView from "../pages/auth/RegisterView";

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
    <Route path="/login" element={<LoginView />} />
    {/* <Route path="/register" element={<RegisterView />} /> */}
    <Route path="/" element={<ProtectedRoutes />}>
      <Route path="/" element={<App />}>
        <Route index element={<AllCoursesPage />} />
        <Route path="courses" element={<AllCoursesPage />} />
        <Route path="assignments" element={<AllAssignmentsPage />} />
        <Route path="exams" element={<AllExamsPage />} />
        <Route path="quizzes" element={<AllQuizzesPage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="feedback" element={<AssessmentFeedbackPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="add-student" element={<AddStudentPage />} />
        <Route path="assessment-studio" element={<AssessmentStudioPage />} />
        <Route path="create-course" element={<CreateCoursePage />} />
        <Route path="delete-course" element={<DeleteCoursePage />} />
        <Route path="edit-course" element={<EditCoursePage />} />
        <Route path="remove-student" element={<RemoveStudentPage />} />
        <Route path="view-all-students-grade" element={<ViewAllStudentsGradePage />} />
        <Route path="join-course" element={<JoinCoursePage />} />
        <Route path="take-assessment" element={<TakeAssessmentPage />} />
        <Route path="view-grades" element={<ViewGradesPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Route>
    </>
  )
);

export default router;
