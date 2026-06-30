import React, { useState, useEffect } from 'react'
import { useAuth } from '../../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons'
import { useParams } from 'react-router-dom'
import { getAssessmentStatus } from '../../utils/assessmentDue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function AssessmentRow({ assessment }) {
  const status = getAssessmentStatus(assessment)

  return (
    <tr className="grades-table-row">
      <td className="grades-table-cell grades-table-cell--title">
        {assessment.title}
      </td>
      <td className="grades-table-cell grades-table-cell--grade">
        {console.log("grade", assessment.grade, "percent", assessment.percent)}
        {assessment.grade != null
          ? `${assessment.grade}/${assessment.max_grade}`
          : '—'}
      </td>
      <td className="grades-table-cell grades-table-cell--percent">
        {assessment.percent != null
          ? `${assessment.percent}%`
          : '—'}
      </td>
      <td className="grades-table-cell grades-table-cell--status">
        <span
          className={`grades-status-badge ${
            status === 'submitted'
              ? 'grades-status-badge--submitted'
              : status === 'missing' ? 'grades-status-badge--missing'
              : status === 'available' ? 'grades-status-badge--available'
              : 'grades-status-badge--late'
          }`}
        >
          {status === 'submitted' ? 'Submitted' : status === 'missing' ? 'Missing' : status === 'available' ? 'Available' : 'Late'}
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
    const fetchAssessments = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/assessments/all/${courseId}`,
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
        console.log(data)
        setAssessmentsList(data)
      } catch (error) {
        console.error('Failed to fetch assessments', error)
      }
    }
    fetchAssessments()
  }, [courseId, token])
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
