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

function EditCoursePage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { courseData } = useCourseContext()

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [courseTitle, setCourseTitle] = useState('')
  const [maxNumStudents, setMaxNumStudents] = useState('')
  const [openEnrollement, setOpenEnrollement] = useState(true)
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

  // Set initial selection once when courses load (do not reset on dropdown change)
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

    setCourseTitle(course.coursetitle || '')
    setMaxNumStudents(String(course.max_num_students ?? ''))
    setOpenEnrollement(Boolean(course.isopenenrollement))
    localStorage.setItem('selected_course', JSON.stringify(course))
  }, [selectedCourseId, courses])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrMessage('')

    if (!selectedCourseId || !courseTitle || !maxNumStudents) {
      setErrMessage('All fields are required')
      return
    }

    try {
      const response = await fetch(`${getApiBase()}/api/courses/${selectedCourseId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseTitle, maxNumStudents, openEnrollement }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update course')
      }

      setShowSuccessModal(true)
    } catch (error) {
      console.error('Failed to update course', error)
      setErrMessage(error.message || 'Failed to update course')
    }
  }

  return (
    <div className="create-course-page">
      <header className="create-course-header">
        <h1>Edit Course</h1>
        <p>Update course title, capacity, and enrollment status.</p>
      </header>

      <form className="create-course-form" onSubmit={handleSubmit}>
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

        <div className="form-group">
          <label htmlFor="course-title">Course Title</label>
          <input
            type="text"
            id="course-title"
            name="courseTitle"
            placeholder="e.g., COSI 104A: Intro to ML"
            required
            value={courseTitle}
            onChange={(e) => setCourseTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="max-students">Max Students</label>
          <input
            type="number"
            id="max-students"
            name="maxStudents"
            min="1"
            placeholder="30"
            required
            value={maxNumStudents}
            onChange={(e) => setMaxNumStudents(e.target.value)}
          />
        </div>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="open-enrollment"
            name="openEnrollment"
            checked={openEnrollement}
            onChange={(e) => setOpenEnrollement(e.target.checked)}
          />
          <label htmlFor="open-enrollment">Open for enrollment</label>
        </div>

        {errMessage && <p className="error-message">{errMessage}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/courses')}>
            Cancel
          </button>
          <button type="submit">Save Changes</button>
        </div>
      </form>

      {showSuccessModal && (
        <div className="create-course-modal-backdrop">
          <div className="create-course-modal">
            <h3>Course updated successfully</h3>
            <p>Your changes have been saved.</p>
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

export default EditCoursePage
