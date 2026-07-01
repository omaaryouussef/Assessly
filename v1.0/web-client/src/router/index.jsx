import React from 'react'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'
import ProtectedRoutes from '../components/auth/ProtectedRoutes'
import RoleGuard from '../components/auth/RoleGuard'
import App from '../App'
import AssessmentFeedbackPage from '../pages/AssessmentFeedbackPage'
import AccountPage from '../pages/AccountPage'
import CourseHomePage from '../pages/CourseHomePage'
import HelpPage from '../pages/HelpPage'
import PeoplePage from '../pages/PeoplePage'
import SchedulePage from '../pages/SchedulePage'
import AllQuizzesPage from '../pages/AllQuizzesPage'
import AllExamsPage from '../pages/AllExamsPage'
import AllAssignmentsPage from '../pages/AllAssignmentsPage'
import AllCoursesPage from '../pages/AllCoursesPage'
import AddStudentPage from '../pages/Instructor/AddStudentPage'
import AssessmentStudioPage from '../pages/Instructor/AssessmentStudioPage'
import CreateCoursePage from '../pages/Instructor/CreateCoursePage'
import DeleteCoursePage from '../pages/Instructor/DeleteCoursePage'
import EditCoursePage from '../pages/Instructor/EditCoursePage'
import RemoveStudentPage from '../pages/Instructor/RemoveStudentPage'
import ViewAllStudentsGradePage from '../pages/Instructor/ViewAllStudentsGradePage'
import JoinCoursePage from '../pages/Student/JoinCoursePage'
import TakeAssessmentPage from '../pages/Student/TakeAssessmentPage'
import ViewGradesPage from '../pages/Student/ViewGradesPage'
import LoginView from '../pages/auth/LoginView'
import RegisterView from '../pages/auth/RegisterView'

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      <Route path="/login" element={<LoginView />} />
      <Route path="/register" element={<RegisterView />} />
      <Route path="/" element={<ProtectedRoutes />}>
        <Route path="/" element={<App />}>
          <Route index element={<AllCoursesPage />} />
          {/* Course related routes */}
          <Route path="courses" element={<AllCoursesPage />} />
          <Route path="course/:courseId/home" element={<CourseHomePage />} />
          <Route
            path="course/:courseId/assignments"
            element={<AllAssignmentsPage />}
          />
          <Route path="course/:courseId/exams" element={<AllExamsPage />} />
          <Route path="course/:courseId/quizzes" element={<AllQuizzesPage />} />
          <Route path="course/:courseId/people" element={<PeoplePage />} />
          <Route
            path="course/:courseId/feedback/:assessmentId/:studentId"
            element={<AssessmentFeedbackPage />}
          />

          {/* Navbar related routes */}
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="account" element={<AccountPage />} />

          {/* Instructor and TA shared routes */}
          <Route element={<RoleGuard allowedRoles={['INSTRUCTOR', 'TA']} />}>
            <Route
              path="course/:courseId/assessment-studio"
              element={<AssessmentStudioPage />}
            />
            <Route
              path="course/:courseId/view-all-students-grade"
              element={<ViewAllStudentsGradePage />}
            />
          </Route>

          {/* Instructor only routes */}
          <Route element={<RoleGuard allowedRoles={['INSTRUCTOR']} />}>
            <Route path="add-student" element={<AddStudentPage />} />
            <Route path="create-course" element={<CreateCoursePage />} />
            <Route path="delete-course" element={<DeleteCoursePage />} />
            <Route path="edit-course" element={<EditCoursePage />} />
            <Route
              path="course/:courseId/remove-student"
              element={<RemoveStudentPage />}
            />
          </Route>

          {/* TA and Student shared routes */}
          <Route element={<RoleGuard allowedRoles={['TA', 'STUDENT']} />}>
            <Route path="join-course" element={<JoinCoursePage />} />
          </Route>

          {/* Student related routes */}
          <Route element={<RoleGuard allowedRoles={['STUDENT']} />}>
            <Route
              path="course/:courseId/take-assessment"
              element={<TakeAssessmentPage />}
            />
            <Route
              path="course/:courseId/view-grades"
              element={<ViewGradesPage />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </>
  )
)

export default router
