import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthWrapper'

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function CreateCoursePage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [courseTitle, setCourseTitle] = useState('')
  const [maxNumStudents, setMax] = useState('')
  const [openEnrollement, setOpenEnrollement] = useState(true)
  const [errMessage, setErrMessage] = useState('')
  const [successKey, setSuccessKey] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const instructorId = user?.user_id

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrMessage('')
    if (!courseTitle || !maxNumStudents || !instructorId || openEnrollement === null) {
      setErrMessage('All fields are required')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/api/courses/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ courseTitle, maxNumStudents, instructorId, openEnrollement }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create course')
      }

      const createdCourse = data[0];
      const generatedKey = createdCourse?.enrollementkey || 'N/A'
      setSuccessKey(generatedKey)
      setShowSuccessModal(true)
    } catch (error) {
      console.error('Failed to create course', error)
      setErrMessage(error.message || 'Failed to create course')
    }
  }

  return (
    <div className="create-course-page">
      <header className="create-course-header">
        <h1>Create Course</h1>
        <p>Set up a new course and generate an enrollment key for students.</p>
      </header>

      <form className="create-course-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="course-title">Course Title</label>
          <input
            type="text"
            id="course-title"
            name="courseTitle"
            placeholder="e.g., COSI 104A-#section: Intro to ML"
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
            onChange={(e) => setMax(e.target.value)}
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
        {errMessage && <p className='error-message'>{errMessage}</p>}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/courses')}>Cancel</button>
          <button type="submit">Create Course</button>
        </div>
      </form>

      {showSuccessModal && (
        <div className="create-course-modal-backdrop">
          <div className="create-course-modal">
            <h3>Course created successfully</h3>
            <p>Your enrollment key:</p>
            <div className="create-course-key">{successKey}</div>
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

export default CreateCoursePage
