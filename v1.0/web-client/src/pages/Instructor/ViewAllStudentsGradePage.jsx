import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons'
import { getAssessmentStatus } from '../../utils/assessmentDue'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function StatusWord({ assessment }) {
  const status = getAssessmentStatus(assessment)
  const label =
    status === 'submitted'
      ? 'Submitted'
      : status === 'missing'
        ? 'Missing'
        : status === 'available'
          ? 'Available'
          : 'Late'

  return (
    <span className={`instructor-grades-status-word instructor-grades-status-word--${status}`}>
      {label}
    </span>
  )
}

function AssessmentGradeCell({
  assessment,
  studentName,
  studentId,
  gradeValue,
  isDirty,
  onGradeChange,
  onOpenAssessment,
}) {
  const status = getAssessmentStatus(assessment)
  const showLink = status === 'submitted' || status === 'late'
  const canEditGrade =
    status === 'submitted' || status === 'late' || status === 'missing'

  return (
    <div className="instructor-grades-assessment-cell-inner">
      <StatusWord assessment={assessment} />
      {showLink && (
        <button
          type="button"
          className="instructor-grades-assessment-link"
          onClick={() => onOpenAssessment(assessment, studentId, studentName)}
        >
          {assessment.title}
        </button>
      )}
      <input
        type="number"
        className={`instructor-grades-input${isDirty ? ' instructor-grades-input--dirty' : ''}`}
        min={0}
        max={assessment.max_grade}
        step="0.1"
        placeholder={`/ ${assessment.max_grade}`}
        value={gradeValue}
        onChange={(e) =>
          onGradeChange(studentId, assessment.assessment_id, e.target.value)
        }
        disabled={!canEditGrade}
        aria-label={`Grade for ${studentName} on ${assessment.title}`}
      />
    </div>
  )
}

function gradeKey(studentId, assessmentId) {
  return `${studentId}-${assessmentId}`
}

function normalizeGradeCompare(value) {
  if (value === '' || value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isNaN(numeric) ? null : numeric
}

function buildSavedGradesMap(rows) {
  const map = {}
  for (const row of rows) {
    for (const assessment of row.assessments ?? []) {
      const status = getAssessmentStatus(assessment)
      const canEditGrade =
        status === 'submitted' || status === 'late' || status === 'missing'
      if (!canEditGrade) continue
      const key = gradeKey(row.student_id, assessment.assessment_id)
      map[key] =
        assessment.grade === null || assessment.grade === undefined
          ? ''
          : String(assessment.grade)
    }
  }
  return map
}

function ViewAllStudentsGradePage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [assessmentsForAllStudents, setAssessmentsForAllStudents] = useState([])
  const [savedGrades, setSavedGrades] = useState({})
  const [gradeDrafts, setGradeDrafts] = useState({})
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchAssessmentsForAllStudents = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/assessments/all-students/${courseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!response.ok) {
          throw new Error('Failed to fetch assessments for all students')
        }
        const data = await response.json()
        setAssessmentsForAllStudents(data)
        setSavedGrades(buildSavedGradesMap(data))
        setGradeDrafts({})
        setLoadError('')
      } catch (error) {
        console.error('Failed to fetch assessments for all students', error)
        setLoadError(error.message || 'Failed to load grades')
      }
    }

    if (courseId && token) {
      fetchAssessmentsForAllStudents()
    }
  }, [courseId, token])

  const assessmentColumns = useMemo(() => {
    if (assessmentsForAllStudents.length === 0) return []
    return assessmentsForAllStudents[0].assessments ?? []
  }, [assessmentsForAllStudents])

  const getCurrentGradeValue = useCallback(
    (studentId, assessmentId) => {
      const key = gradeKey(studentId, assessmentId)
      if (gradeDrafts[key] !== undefined) return gradeDrafts[key]
      return savedGrades[key] ?? ''
    },
    [gradeDrafts, savedGrades]
  )

  const isCellDirty = useCallback(
    (studentId, assessmentId) => {
      const key = gradeKey(studentId, assessmentId)
      const current = getCurrentGradeValue(studentId, assessmentId)
      const saved = savedGrades[key] ?? ''
      return normalizeGradeCompare(current) !== normalizeGradeCompare(saved)
    },
    [getCurrentGradeValue, savedGrades]
  )

  const hasUnsavedChanges = useMemo(() => {
    const keys = new Set([
      ...Object.keys(savedGrades),
      ...Object.keys(gradeDrafts),
    ])
    for (const key of keys) {
      const current =
        gradeDrafts[key] !== undefined ? gradeDrafts[key] : savedGrades[key] ?? ''
      const saved = savedGrades[key] ?? ''
      if (normalizeGradeCompare(current) !== normalizeGradeCompare(saved)) {
        return true
      }
    }
    return false
  }, [gradeDrafts, savedGrades])

  const blocker = useBlocker(hasUnsavedChanges)

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [hasUnsavedChanges])

  const getDirtyEntries = useCallback(() => {
    const entries = []
    for (const row of assessmentsForAllStudents) {
      for (const assessment of row.assessments ?? []) {
        const studentId = row.student_id
        const assessmentId = assessment.assessment_id
        if (!isCellDirty(studentId, assessmentId)) continue
        entries.push({
          studentId,
          assessmentId,
          grade: getCurrentGradeValue(studentId, assessmentId),
        })
      }
    }
    return entries
  }, [assessmentsForAllStudents, getCurrentGradeValue, isCellDirty])

  const handleSave = useCallback(async () => {
    const entries = getDirtyEntries()
    if (entries.length === 0) return true

    const hasEmptyGrade = entries.some(
      (entry) =>
        entry.grade === '' || normalizeGradeCompare(entry.grade) === null
    )
    if (hasEmptyGrade) {
      setSaveError('Enter a grade for every changed cell before saving.')
      return false
    }

    setIsSaving(true)
    setSaveError('')

    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/grades/${courseId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ grades: entries }),
        }
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save grades')
      }

      const nextSaved = { ...savedGrades }
      for (const entry of entries) {
        nextSaved[gradeKey(entry.studentId, entry.assessmentId)] = String(
          entry.grade
        )
      }

      setSavedGrades(nextSaved)
      setGradeDrafts({})
      setAssessmentsForAllStudents((prev) =>
        prev.map((row) => ({
          ...row,
          assessments: row.assessments.map((assessment) => {
            const entry = entries.find(
              (item) =>
                item.studentId === row.student_id &&
                item.assessmentId === assessment.assessment_id
            )
            if (!entry) return assessment
            return { ...assessment, grade: Number(entry.grade) }
          }),
        }))
      )

      if (blocker.state === 'blocked') {
        blocker.reset()
      }

      return true
    } catch (error) {
      console.error('Failed to save grades', error)
      setSaveError(error.message || 'Failed to save grades')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    blocker,
    courseId,
    getDirtyEntries,
    savedGrades,
    token,
  ])

  const handleGradeChange = (studentId, assessmentId, value) => {
    setGradeDrafts((prev) => ({
      ...prev,
      [gradeKey(studentId, assessmentId)]: value,
    }))
    setSaveError('')
  }

  const openAssessment = (assessment, studentId, studentName) => {
    navigate(
      `/course/${courseId}/feedback/${assessment.assessment_id}/${studentId}`,
      {
        state: { assessmentToGrade: assessment, studentId, studentName },
      }
    )
  }

  const columnCount = assessmentColumns.length

  return (
    <div className="view-grades-page instructor-grades-page">
      <div className="course-special-header view-grades-header">
        <FontAwesomeIcon
          icon={faChartLine}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p className="view-grades-title">All Students Grades</p>
      </div>

      {blocker.state === 'blocked' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Unsaved grade changes</h2>
            <p>Save your grade changes before leaving this page.</p>
            {saveError && (
              <p className="instructor-grades-error instructor-grades-modal-error">
                {saveError}
              </p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={() => blocker.reset()}
                disabled={isSaving}
              >
                Stay on page
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="view-grades-content">
        <div className="instructor-grades-toolbar">
          <button
            type="button"
            className={`instructor-grades-save-btn${
              hasUnsavedChanges ? ' instructor-grades-save-btn--dirty' : ''
            }`}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
          >
            {isSaving
              ? 'Saving…'
              : hasUnsavedChanges
                ? 'Save changes'
                : 'All changes saved'}
          </button>
        </div>

        {loadError && <p className="instructor-grades-error">{loadError}</p>}
        {saveError && blocker.state !== 'blocked' && (
          <p className="instructor-grades-error">{saveError}</p>
        )}

        <div className="view-grades-table-card instructor-grades-table-card">
          <table className="grades-table instructor-grades-table">
            <thead>
              <tr>
                <th rowSpan={2} className="instructor-grades-student-head">
                  Student
                </th>
                <th
                  colSpan={columnCount || 1}
                  className="instructor-grades-group-head"
                >
                  Assessment
                </th>
              </tr>
              {columnCount > 0 && (
                <tr>
                  {assessmentColumns.map((assessment) => (
                    <th
                      key={`assessment-${assessment.assessment_id}`}
                      className="instructor-grades-subhead"
                    >
                      {assessment.title}
                    </th>
                  ))}
                </tr>
              )}
            </thead>
            <tbody>
              {assessmentsForAllStudents.length > 0 && columnCount > 0 ? (
                assessmentsForAllStudents.map((row) => (
                  <tr
                    key={row.student_id ?? row.student}
                    className="grades-table-row"
                  >
                    <td className="grades-table-cell instructor-grades-student-cell">
                      {row.student}
                    </td>
                    {row.assessments.map((assessment) => (
                      <td
                        key={`grade-${row.student_id}-${assessment.assessment_id}`}
                        className="grades-table-cell instructor-grades-assessment-cell"
                      >
                        <AssessmentGradeCell
                          assessment={assessment}
                          studentName={row.student}
                          studentId={row.student_id}
                          gradeValue={getCurrentGradeValue(
                            row.student_id,
                            assessment.assessment_id
                          )}
                          isDirty={isCellDirty(
                            row.student_id,
                            assessment.assessment_id
                          )}
                          onGradeChange={handleGradeChange}
                          onOpenAssessment={openAssessment}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columnCount > 0 ? 1 + columnCount : 2}
                    className="grades-table-empty"
                  >
                    {assessmentsForAllStudents.length === 0
                      ? 'No students enrolled in this course yet'
                      : 'No assessments created for this course yet'}
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

export default ViewAllStudentsGradePage
