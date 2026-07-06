import React, { useEffect, useState } from 'react'
import { getApiBase } from '../../config/api'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthWrapper'
import { useCourseContext } from '../../../contexts/CourseContext'

function getInitialCourse(locationState, courseData) {
  if (locationState?.course) return locationState.course
  if (courseData?.course_id) return courseData
  try {
    const raw = localStorage.getItem('selected_course')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function DeleteCoursePage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { courseData } = useCourseContext()

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedCourseTitle, setSelectedCourseTitle] = useState('')
  const [errMessage, setErrMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    if (!token) return
    const fetchCourses = async () => {
      const response = await fetch(`${getApiBase()}/api/courses/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Failed to fetch courses.')
      const data = await response.json()
      setCourses(data)
    }
    fetchCourses().catch((error) => {
      console.error(error)
      setErrMessage('Failed to load courses.')
    })
  }, [token])

  useEffect(() => {
    if (courses.length === 0 || selectedCourseId) return

    const initial = getInitialCourse(location.state, courseData)
    if (initial?.course_id) {
      setSelectedCourseId(String(initial.course_id))
    } else {
      setSelectedCourseId(String(courses[0].course_id))
    }
  }, [courses, location.state, courseData, selectedCourseId])

  useEffect(() => {
    if (!selectedCourseId || courses.length === 0) return
    const course = courses.find(
      (c) => String(c.course_id) === String(selectedCourseId),
    )
    if (!course) return

    setSelectedCourseTitle(course.coursetitle || '')
    localStorage.setItem('selected_course', JSON.stringify(course))
  }, [selectedCourseId, courses])

  const handleDelete = async (e) => {
    e.preventDefault()
    setErrMessage('')

    if (!selectedCourseId) {
      setErrMessage('Please select a course to delete')
      return
    }

    const confirmed = window.confirm(
      `Delete "${selectedCourseTitle}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      const response = await fetch(`${getApiBase()}/api/courses/${selectedCourseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete course')
      }

      localStorage.removeItem('selected_course')
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Failed to delete course', error)
      setErrMessage(error.message || 'Failed to delete course')
    }
  }

  return (
    <div className="create-course-page">
      <header className="create-course-header">
        <h1>Delete Course</h1>
        <p>Permanently remove a course from your account.</p>
      </header>

      <form className="create-course-form" onSubmit={handleDelete}>
        <div className="form-group">
          <label htmlFor="course-select">Select Course</label>
          <select
            id="course-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            required
          >
            <option value="" disabled>
              Choose a course
            </option>
            {courses.map((course) => (
              <option key={course.course_id} value={String(course.course_id)}>
                {course.coursetitle}
              </option>
            ))}
          </select>
        </div>

        {selectedCourseTitle && (
          <p className="delete-course-warning">
            You are about to delete <strong>{selectedCourseTitle}</strong>.
          </p>
        )}

        {errMessage && <p className="error-message">{errMessage}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/courses')}>
            Cancel
          </button>
          <button type="submit" className="delete-course-submit-btn">
            Delete Course
          </button>
        </div>
      </form>

      {showSuccessModal && (
        <div className="create-course-modal-backdrop">
          <div className="create-course-modal">
            <h3>Course deleted successfully</h3>
            <p>The selected course has been removed.</p>
            <button
              type="button"
              className="create-course-modal-btn"
              onClick={() => {
                setShowSuccessModal(false)
                navigate('/courses')
              }}
            >
              Go to Courses
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeleteCoursePage
