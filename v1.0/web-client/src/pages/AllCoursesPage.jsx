import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthWrapper'
import { useCourseContext } from '../../contexts/CourseContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlus,
  faUserGroup,
  faCode,
  faSitemap,
  faTerminal,
  faBookOpen,
  faKey,
  faClockRotateLeft,
  faPenToSquare,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
const ICON_THEMES = ['blue', 'orange', 'purple', 'gray']
const CARD_ICONS = [faCode, faSitemap, faTerminal, faBookOpen]

function getCardVisuals(courseId) {
  const index = Number(courseId) % CARD_ICONS.length
  return {
    icon: CARD_ICONS[index],
    iconTheme: ICON_THEMES[index],
  }
}

function sortCoursesForDisplay(courses) {
  return [...courses].sort((a, b) => {
    const aArchived = !a.isOpenForEnrollment
    const bArchived = !b.isOpenForEnrollment
    if (aArchived !== bArchived) {
      return aArchived ? 1 : -1
    }
    return Number(a.courseId) - Number(b.courseId)
  })
}

function CourseCard({ course, isInstructor }) {
  const navigate = useNavigate()
  const { setCourseData } = useCourseContext()
  const {
    course_id: courseId,
    coursetitle: courseTitle,
    num_enrolled_students: numStudents,
    enrollementkey: enrollmentKey,
    isopenenrollement: isOpenForEnrollment,
  } = course
  const isArchived = !isOpenForEnrollment
  const { icon, iconTheme } = isArchived
    ? { icon: faClockRotateLeft, iconTheme: 'gray' }
    : getCardVisuals(courseId)

  const persistCourseSelection = () => {
    setCourseData(course)
    localStorage.setItem('selected_course', JSON.stringify(course))
  }

  const handleEdit = () => {
    persistCourseSelection()
    navigate('/edit-course', { state: { course } })
  }

  const handleDelete = () => {
    persistCourseSelection()
    navigate('/delete-course', { state: { course } })
  }

  return (
    <article
      className={`course-card${isArchived ? ' course-card--archived' : ''}`}
    >
      <div className="course-card-top">
        <div className={`course-card-icon course-card-icon--${iconTheme}`}>
          <FontAwesomeIcon icon={icon} />
        </div>
        <div className="course-card-top-meta">
          {isInstructor && (
            <div className="course-card-actions">
              <button
                type="button"
                className="course-card-action-btn"
                aria-label="Edit course"
                onClick={handleEdit}
              >
                <FontAwesomeIcon icon={faPenToSquare} />
              </button>
              <button
                type="button"
                className="course-card-action-btn course-card-action-btn--delete"
                aria-label="Delete course"
                onClick={handleDelete}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          )}
          <span className="course-card-status">
            {isArchived ? 'Archived' : 'Active'}
          </span>
        </div>
      </div>
      <button
        className="course-button"
        onClick={() => {
          persistCourseSelection()
          navigate(`/course/${courseId}/home`)
        }}
      >
        <h3 className="course-card-title">{courseTitle}</h3>
        <p className="course-card-enrollment">
          <FontAwesomeIcon
            icon={faUserGroup}
            className="course-card-enrollment-icon"
          />
          <span>
            {numStudents} {numStudents === 1 ? 'Student' : 'Students'} Enrolled
          </span>
        </p>

        <div className="course-card-divider" />

        <div className="course-card-section">
          <p className="course-card-section-label">ENROLLMENT KEY</p>
          <p className="course-card-enrollment-key">
            <FontAwesomeIcon icon={faKey} />
            <span>{enrollmentKey}</span>
          </p>
        </div>
      </button>
    </article>
  )
}

function AllCoursesPage() {
  const { user, token } = useAuth()
  const [courseList, setCourseList] = useState([])

  useEffect(() => {
    const fetchCourses = async () => {
      const response = await fetch(`${API_BASE}/api/courses/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch courses.')
      const data = await response.json()
      setCourseList(data)
    }
    fetchCourses()
  }, [])
  const isInstructor = user?.role === 'INSTRUCTOR'
  const isTa = user?.role === 'TA'
  const actionPath = isInstructor ? '/create-course' : '/join-course'
  const actionLabel = isInstructor ? 'Create Course' : 'Join Course'

  return (
    <div className="courses-page">
      <header className="courses-page-header">
        <div className="courses-page-header-text">
          <h1 className="courses-page-title">Courses</h1>
          <p className="courses-page-subtitle">
            {isTa || isInstructor ? 'Manage your active curriculum and student assessments.' : 'View your active courses and manage your assessments.'}
          </p>
        </div>
        {courseList.length !== 0 && (
          <Link to={actionPath} className="courses-page-action-btn">
            <FontAwesomeIcon icon={faPlus} />
            <span>{actionLabel}</span>
          </Link>
        )}
      </header>

      {courseList.length > 0 ? (
        <div className="courses-grid">
          {sortCoursesForDisplay(courseList).map((course) => (
            <CourseCard
              key={course.course_id}
              course={course}
              isInstructor={isInstructor}
            />
          ))}
        </div>
      ) : (
        <div className="courses-empty" role="status">
          <div className="courses-empty-icon">
            <FontAwesomeIcon icon={faBookOpen} />
          </div>
          <h2 className="courses-empty-title">No courses yet</h2>
          <p className="courses-empty-text">
            {isInstructor
              ? 'Create your first course to manage assessments and share an enrollment key with students.'
              : 'Join a course using the enrollment key provided by your instructor.'}
          </p>
          <Link to={actionPath} className="courses-empty-action">
            <FontAwesomeIcon icon={faPlus} />
            <span>{actionLabel}</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default AllCoursesPage
