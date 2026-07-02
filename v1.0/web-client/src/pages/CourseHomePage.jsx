import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHouse,
  faChalkboardUser,
  faKey,
  faUserGroup,
  faDoorOpen,
  faClock,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../components/auth/AuthWrapper'
import { useCourseContext } from '../../contexts/CourseContext'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function formatValue(value) {
  if (!value || String(value).trim() === '') return 'Not set'
  return value
}

function CourseHomePage() {
  const { courseId } = useParams()
  const { token } = useAuth()
  const { courseData } = useCourseContext()
  const [homeData, setHomeData] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const fetchCourseHome = useCallback(async () => {
    if (!courseId || !token) return

    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await fetch(`${API_BASE}/api/courses/home/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load course home')
      }
      setHomeData(data)
    } catch (error) {
      console.error('Failed to fetch course home', error)
      setHomeData(null)
      setErrorMessage(error.message || 'Failed to load course home')
    } finally {
      setIsLoading(false)
    }
  }, [courseId, token])

  useEffect(() => {
    fetchCourseHome()
  }, [fetchCourseHome])

  const pageTitle =
    homeData?.course_title ?? courseData?.coursetitle ?? 'Course'

  return (
    <div className="course-home-page-container">
      <div className="course-special-header">
        <FontAwesomeIcon
          icon={faHouse}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p>Home</p>
      </div>

      {isLoading ? (
        <p className="course-home-status">Loading course details...</p>
      ) : errorMessage ? (
        <p className="course-home-status course-home-status--error">
          {errorMessage}
        </p>
      ) : (
        <>
          <div className="course-home-grid">
            <section className="course-home-card">
              <div className="course-home-card-header">
                <FontAwesomeIcon icon={faChalkboardUser} />
                <h2>Instructor</h2>
              </div>
              <dl className="course-home-details">
                <div className="course-home-detail-row">
                  <dt>Name</dt>
                  <dd>{formatValue(homeData?.instructor?.name)}</dd>
                </div>
                <div className="course-home-detail-row">
                  <dt>Email</dt>
                  <dd>{formatValue(homeData?.instructor?.email)}</dd>
                </div>
              </dl>
            </section>

            <section className="course-home-card">
              <div className="course-home-card-header">
                <FontAwesomeIcon icon={faKey} />
                <h2>Enrollment Key</h2>
              </div>
              <p className="course-home-enrollment-key">
                {formatValue(homeData?.enrollment_key)}
              </p>
            </section>

            <section className="course-home-card course-home-card--wide">
              <div className="course-home-card-header">
                <FontAwesomeIcon icon={faUserGroup} />
                <h2>Teaching Assistants</h2>
              </div>
              {homeData?.tas?.length > 0 ? (
                <ul className="course-home-ta-list">
                  {homeData.tas.map((ta) => (
                    <li key={ta.user_id} className="course-home-ta-item">
                      <span className="course-home-ta-name">{ta.name}</span>
                      <span className="course-home-ta-email">{ta.email}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="course-home-empty">
                  No teaching assistants assigned
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default CourseHomePage
