import React, { useState, useEffect } from 'react'
import { getApiBase } from '../../config/api'
import { useAuth } from '../../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine, faCommentDots } from '@fortawesome/free-solid-svg-icons'
import { useNavigate, useParams } from 'react-router-dom'
import { getAssessmentStatus } from '../../utils/assessmentDue'
import LoadingPage from '../../components/LoadingPage'  

function AssessmentRow({ assessment, user }) {
  const [isLoading, setIsLoading] = useState(true)
  const status = getAssessmentStatus(assessment)
  const { courseId } = useParams()
  const navigate = useNavigate()
  const canViewFeedback = status === 'graded'

  const openFeedback = () => {
    if (!canViewFeedback) return
    navigate(
      `/course/${courseId}/feedback/${assessment.assessment_id}/${user?.user_id}`, {
        state: {
          assessmentToView: assessment,
        },
      }
    )
  }

  return (
    <tr className="grades-table-row">
      <td className="grades-table-cell grades-table-cell--title">
        {canViewFeedback ? (
          <button
            type="button"
            className="grades-feedback-link"
            onClick={openFeedback}
          >
            <span className="grades-feedback-link-label">
              {assessment.title}
            </span>
            <span className="grades-feedback-link-hint">
              <FontAwesomeIcon icon={faCommentDots} />
              View feedback
            </span>
          </button>
        ) : (
          <span className="grades-assessment-title-static">
            {assessment.title}
          </span>
        )}
      </td>

      <td className="grades-table-cell grades-table-cell--grade">
        {assessment.grade != null
          ? `${assessment.grade}/${assessment.max_grade}`
          : '—'}
      </td>
      <td className="grades-table-cell grades-table-cell--percent">
        {assessment.percent != null ? `${assessment.percent}%` : '—'}
      </td>
      <td className="grades-table-cell grades-table-cell--status">
        <span
          className={`grades-status-badge ${
            status === 'submitted'
              ? 'grades-status-badge--submitted'
              : status === 'missing'
                ? 'grades-status-badge--missing'
                : status === 'available'
                  ? 'grades-status-badge--available'
                  : status === 'graded'
                    ? 'grades-status-badge--graded'
                    : 'grades-status-badge--late'
          }`}
        >
          {status === 'submitted'
            ? 'Submitted'
            : status === 'missing'
              ? 'Missing'
              : status === 'available'
                ? 'Available'
                : status === 'graded'
                  ? 'Graded'
                  : 'Late'}
        </span>
      </td>
    </tr>
  )
}

function ViewGradesPage() {
  const { courseId } = useParams()
  const { user, token } = useAuth()
  const [assessmentsList, setAssessmentsList] = useState([])

  useEffect(() => {
    setIsLoading(true)
    const fetchAssessments = async () => {
      try {
        const response = await fetch(
          `${getApiBase()}/api/assessments/all/${courseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        if (!response.ok) {
          throw new Error('Failed to fetch assessments')
        }
        const data = await response.json()
        setAssessmentsList(data)
      } catch (error) {
        console.error('Failed to fetch assessments', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAssessments()
  }, [courseId, token])
  if (isLoading) {
    return <LoadingPage message="Loading grades…" />
  }
  return (
    <div className="view-grades-page">
      <div className="course-special-header view-grades-header">
        <FontAwesomeIcon
          icon={faChartLine}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p className="view-grades-title">View Grades</p>
      </div>
      <div className="view-grades-content">
        <div className="view-grades-table-card">
          <table className="grades-table">
            <thead>
              <tr>
                <th>Assessment</th>
                <th>Grade</th>
                <th>Percentage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assessmentsList.length > 0 ? (
                assessmentsList.map((assessment) => (
                  <AssessmentRow
                    key={assessment.assessment_id}
                    assessment={assessment}
                    user={user}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="grades-table-empty">
                    No assessments created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ViewGradesPage
