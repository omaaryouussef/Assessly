import React, { useState, useEffect, useCallback } from 'react'
import { getApiBase } from '../config/api'
import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFilePen,
  faPlus,
  faFile,
  faCode,
  faFileLines,
  faTerminal,
  faClock,
  faCalendarDays,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../components/auth/AuthWrapper'
import { formatDueDateTimeLabel, getAssessmentStatus } from '../utils/assessmentDue'

const EXAM_ICONS = {
  CODING: faCode,
  ESSAY: faFileLines,
  MCQ: faTerminal,
}

function ExamRow({
  exam,
  canManage,
  onPublishClick,
  onPublishNewStudentsClick,
  onCloseClick,
  onReopenClick,
  isPublishing,
  isClosing,
  setShowEditModal,
  setShowDeleteModal,
  setExamToEdit,
  setExamToDelete,
  onRowClick,
}) {
  const icon = EXAM_ICONS[exam.question_type] ?? faFile
  const isPublished = exam.is_published;
  const status = getAssessmentStatus(exam)
  return (
    <div className="assignment-row" onClick={exam.is_published && !exam.is_closed && status === 'available' ? onRowClick : undefined}>
      <div className="assignment-row-icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className="assignment-row-body">
        <h3 className="assignment-row-title">{exam.title}</h3>
        <p className="assignment-row-meta">
          <FontAwesomeIcon icon={faClock} className="assignment-meta-icon" />
          {exam.duration} min | {exam.max_grade} pts
          {exam.due_date ? (
            <>
              {' '}
              |{' '}
              <FontAwesomeIcon
                icon={faCalendarDays}
                className="assignment-meta-icon"
              />{' '}
              {formatDueDateTimeLabel(exam.due_date, exam.due_time)}
            </>
          ) : null}
        </p>
        {canManage && (
          <div className="assignment-row-action-buttons">
            {!isPublished && (
            <button
              type="button"
              className="assignment-row-action-btn assignment-row-action-btn--edit"
              aria-label={`Edit ${exam.title}`}
              onClick={() => {
                  setShowEditModal(true)
                  setExamToEdit(exam)
                }}
              >
                <FontAwesomeIcon icon={faPen} />
              </button>
            )}
            <button
              type="button"
              className="assignment-row-action-btn assignment-row-action-btn--delete"
              aria-label={`Delete ${exam.title}`}
              onClick={() => {
                setShowDeleteModal(true)
                setExamToDelete(exam)
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        )}
      </div>
      <div className="assignment-row-actions">
        {canManage ? (
          <>
            <span
              className={`assignment-status-badge ${
                exam.is_published
                  ? 'assignment-status-badge--published'
                  : 'assignment-status-badge--unpublished'
              }`}
            >
              {exam.is_published ? 'Published' : 'Not Published'}
            </span>
            {exam.is_closed && (
              <span className="assignment-status-badge assignment-status-badge--closed">
                Closed
              </span>
            )}
            <button
              type="button"
              className={`assignment-publish-btn ${
                exam.is_published ? 'assignment-publish-btn--unpublish' : ''
              }`}
              onClick={() => onPublishClick(exam)}
              disabled={isPublishing || isClosing}
            >
              {isPublishing
                ? 'Saving...'
                : exam.is_published
                  ? 'Unpublish'
                  : 'Publish'}
            </button>
            {exam.is_published && (
              <>
                {exam.is_closed ? (
                  <button
                    type="button"
                    className="quiz-close-btn quiz-close-btn--reopen"
                    onClick={() => onReopenClick(exam)}
                    disabled={isPublishing || isClosing}
                  >
                    {isClosing ? 'Saving...' : 'Reopen Exam'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="quiz-close-btn"
                    onClick={() => onCloseClick(exam)}
                    disabled={isPublishing || isClosing}
                  >
                    Close Exam
                  </button>
                )}
              </>
            )}
            {exam.is_published && !exam.is_closed && (
              <button
                type="button"
                className="assignment-add-students-btn"
                onClick={() => onPublishNewStudentsClick(exam)}
                disabled={isPublishing || isClosing}
              >
                Add Student
              </button>
            )}
          </>
        ) : (
          <>
            {status === 'submitted' ? (
              <span className="assignment-status-badge assignment-status-badge--submitted">
                Submitted
              </span>
            ) : status === 'missing' ? (
              <span className="assignment-status-badge assignment-status-badge--missing">
                Missing
              </span>
            ) : status === 'available' ? (
              <span className="assignment-status-badge assignment-status-badge--available">
                Available
              </span>
            ) : status === 'graded' ? (
              <span className="assignment-status-badge assignment-status-badge--graded">
                Graded
              </span>
            ) : (
              <span className="assignment-status-badge assignment-status-badge--late">
                Late
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function AllExamsPage() {
  const { courseId } = useParams()
  const { user, token } = useAuth()
  const [examsList, setExamsList] = useState([])
  const [publishingId, setPublishingId] = useState(null)
  const [closingId, setClosingId] = useState(null)
  const [examToPublish, setExamToPublish] = useState(null)
  const [publishModalStep, setPublishModalStep] = useState(null)
  const [examToClose, setExamToClose] = useState(null)
  const [studentsList, setStudentsList] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [actionErrMessage, setActionErrMessage] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [examToEdit, setExamToEdit] = useState(null)
  const [examToDelete, setExamToDelete] = useState(null)
  const canManage = user?.role === 'INSTRUCTOR' || user?.role === 'TA'
  const navigate = useNavigate()
  const fetchExams = useCallback(async () => {
    const response = await fetch(
      `${getApiBase()}/api/assessments/exams/${courseId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.ok) throw new Error('Failed to fetch exams')
    const data = await response.json()
    setExamsList(Array.isArray(data) ? data : [])
  }, [courseId, token])

  const fetchStudents = useCallback(async () => {
    setIsLoadingStudents(true)
    try {
      const response = await fetch(
        `${getApiBase()}/api/courses/people/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!response.ok) throw new Error('Failed to fetch students')
      const data = await response.json()
      const students = (data.people ?? []).filter(
        (person) => person.role === 'STUDENT'
      )
      setStudentsList(students)
      setSelectedStudentIds(new Set(students.map((student) => student.user_id)))
    } catch (error) {
      console.error('Failed to fetch students', error)
      setStudentsList([])
      setSelectedStudentIds(new Set())
      setActionErrMessage(error.message || 'Failed to fetch students')
    } finally {
      setIsLoadingStudents(false)
    }
  }, [courseId, token])

  const fetchStudentForAdding = useCallback(
    async (exam) => {
      setIsLoadingStudents(true)
      try {
        const response = await fetch(
          `${getApiBase()}/api/courses/people/${courseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!response.ok) throw new Error('Failed to fetch students')
        const data = await response.json()
        const students = (data.people ?? []).filter(
          (person) => person.role === 'STUDENT'
        )

        const allowedResponse = await fetch(
          `${getApiBase()}/api/assessments/allowed-students/${exam.assessment_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!allowedResponse.ok) {
          throw new Error('Failed to fetch allowed students')
        }
        const allowedData = await allowedResponse.json()
        const allowedStudentIds = allowedData.student_ids ?? []

        const availableStudents = students.filter(
          (student) => !allowedStudentIds.includes(student.user_id)
        )

        setStudentsList(availableStudents)
        setSelectedStudentIds(new Set())
      } catch (error) {
        console.error('Failed to fetch students for adding', error)
        setStudentsList([])
        setSelectedStudentIds(new Set())
        setActionErrMessage(error.message || 'Failed to fetch students')
      } finally {
        setIsLoadingStudents(false)
      }
    },
    [token, courseId]
  )

  useEffect(() => {
    if (!courseId || !token) return
    fetchExams().catch((error) => {
      console.error('Failed to fetch exams', error)
      setExamsList([])
    })
  }, [courseId, token, fetchExams])

  const updateExamInList = (updatedExam) => {
    setExamsList((prev) =>
      prev.map((item) =>
        item.assessment_id === updatedExam.assessment_id
          ? { ...item, ...updatedExam }
          : item
      )
    )
  }

  const resetPublishModal = () => {
    setExamToPublish(null)
    setPublishModalStep(null)
    setStudentsList([])
    setSelectedStudentIds(new Set())
    setActionErrMessage('')
  }

  const updatePublishState = async (assessmentId, body) => {
    setPublishingId(assessmentId)
    setActionErrMessage('')

    try {
      const response = await fetch(
        `${getApiBase()}/api/assessments/${assessmentId}/publish`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update exam')
      }

      updateExamInList(data)
      resetPublishModal()
    } catch (error) {
      console.error('Failed to update exam publish state', error)
      setActionErrMessage(error.message || 'Failed to update exam')
    } finally {
      setPublishingId(null)
    }
  }

  const updateCloseState = async (assessmentId, isClosed) => {
    setClosingId(assessmentId)
    setActionErrMessage('')

    try {
      const response = await fetch(
        `${getApiBase()}/api/assessments/${assessmentId}/close`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_closed: isClosed }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update exam')
      }

      updateExamInList(data)
      setExamToClose(null)
      setActionErrMessage('')
    } catch (error) {
      console.error('Failed to update exam close state', error)
      setActionErrMessage(error.message || 'Failed to update exam')
    } finally {
      setClosingId(null)
    }
  }

  const handlePublishClick = (exam) => {
    if (exam.is_published) {
      updatePublishState(exam.assessment_id, { is_published: false })
      return
    }

    setActionErrMessage('')
    setExamToPublish(exam)
    setPublishModalStep('choose')
  }

  const handlePublishNewStudentsClick = (exam) => {
    fetchStudentForAdding(exam)
    setActionErrMessage('')
    setExamToPublish(exam)
    setPublishModalStep('choose-new-students')
  }

  const handleChoosePublishAll = () => {
    setPublishModalStep('confirm-all')
    setActionErrMessage('')
  }

  const handleChoosePublishSelected = async () => {
    setPublishModalStep('select-students')
    setActionErrMessage('')
    await fetchStudents()
  }

  const handleConfirmPublishAll = () => {
    if (!examToPublish) return
    updatePublishState(examToPublish.assessment_id, {
      is_published: true,
      publish_mode: 'all',
    })
  }

  const handleConfirmPublishSelected = () => {
    if (!examToPublish || selectedStudentIds.size === 0) return
    updatePublishState(examToPublish.assessment_id, {
      is_published: true,
      publish_mode: 'selected',
      student_ids: Array.from(selectedStudentIds),
    })
  }

  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const handleToggleAllStudents = () => {
    if (selectedStudentIds.size === studentsList.length) {
      setSelectedStudentIds(new Set())
      return
    }
    setSelectedStudentIds(
      new Set(studentsList.map((student) => student.user_id))
    )
  }

  const handleCloseClick = (exam) => {
    setActionErrMessage('')
    setExamToClose(exam)
  }

  const handleConfirmClose = () => {
    if (!examToClose) return
    updateCloseState(examToClose.assessment_id, true)
  }

  const handleReopenClick = (exam) => {
    updateCloseState(exam.assessment_id, false)
  }

  const allStudentsSelected =
    studentsList.length > 0 && selectedStudentIds.size === studentsList.length

  const handleConfirmEdit = () => {
    if (!examToEdit) return
    navigate(`/course/${courseId}/assessment-studio`, {state: {assessmentToEdit: examToEdit}})
  }

  const handleConfirmDelete = async () => {
    if (!examToDelete) return
    try {
      const response = await fetch(
        `${getApiBase()}/api/assessments/${examToDelete.assessment_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!response.ok) throw new Error('Failed to delete exam')
      const data = await response.json()
      setExamsList((prev) =>
        prev.filter((exam) => exam.assessment_id !== examToDelete.assessment_id)
      )
      setExamToDelete(null)
      setShowDeleteModal(false)
    } catch (error) {
      console.error('Failed to delete exam', error)
      setActionErrMessage(error.message || 'Failed to delete exam')
    }
  }

  return (
    <div className="assignments-page-container">
      <div className="course-special-header">
        <FontAwesomeIcon
          icon={faFilePen}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p>Exams</p>
      </div>

      {canManage && (
        <div className="assignments-toolbar">
          <button type="button" className="create-assignment-button" onClick={() => navigate(`/course/${courseId}/assessment-studio`, {state: {assessmentType: 'EXAM'}})}>
            <FontAwesomeIcon icon={faPlus} />
            <span>Create Exam</span>
          </button>
        </div>
      )}

      {examsList.length > 0 ? (
        <div className="assignments-list-card">
          {examsList.map((exam) => (
            <ExamRow
              key={exam.assessment_id}
              exam={exam}
              canManage={canManage}
              onPublishClick={handlePublishClick}
              onPublishNewStudentsClick={handlePublishNewStudentsClick}
              onCloseClick={handleCloseClick}
              onReopenClick={handleReopenClick}
              isPublishing={publishingId === exam.assessment_id}
              isClosing={closingId === exam.assessment_id}
              setShowEditModal={setShowEditModal}
              setShowDeleteModal={setShowDeleteModal}
              setExamToEdit={setExamToEdit}
              setExamToDelete={setExamToDelete}
              onRowClick = {
                user?.role === 'STUDENT' ? () => {
                  navigate(
                    `/course/${courseId}/take-assessment/${exam.assessment_id}`,
                    { state: { assessmentToTake: exam } }
                  )
                } : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="assignments-empty">
          <FontAwesomeIcon icon={faFile} />
          <span>No exams yet</span>
        </div>
      )}

      {examToPublish && publishModalStep === 'choose' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Publish Exam</h2>
            <p>
              Choose how to publish <strong>{examToPublish.title}</strong>.
            </p>
            <div className="publish-modal-options">
              <button
                type="button"
                className="publish-modal-option-btn"
                onClick={handleChoosePublishAll}
              >
                Publish to all students
              </button>
              <button
                type="button"
                className="publish-modal-option-btn"
                onClick={handleChoosePublishSelected}
              >
                Select students to publish
              </button>
            </div>
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={resetPublishModal}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {examToPublish && publishModalStep === 'confirm-all' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Publish to All Students</h2>
            <p>
              Are you sure you want to publish{' '}
              <strong>{examToPublish.title}</strong> to all enrolled students?
            </p>
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={() => setPublishModalStep('choose')}
                disabled={publishingId === examToPublish.assessment_id}
              >
                Back
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleConfirmPublishAll}
                disabled={publishingId === examToPublish.assessment_id}
              >
                {publishingId === examToPublish.assessment_id
                  ? 'Publishing...'
                  : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {examToPublish && publishModalStep === 'select-students' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal publish-students-modal">
            <h2>Select Students</h2>
            <p>
              Choose which students can access{' '}
              <strong>{examToPublish.title}</strong>.
            </p>
            {isLoadingStudents ? (
              <p>Loading students...</p>
            ) : (
              <>
                <label className="publish-student-row publish-student-row--select-all">
                  <input
                    type="checkbox"
                    checked={allStudentsSelected}
                    onChange={handleToggleAllStudents}
                  />
                  <span>Select all ({studentsList.length})</span>
                </label>
                <div className="publish-students-list">
                  {studentsList.map((student) => (
                    <label
                      key={student.user_id}
                      className="publish-student-row"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(student.user_id)}
                        onChange={() => handleToggleStudent(student.user_id)}
                      />
                      <span className="publish-student-name">
                        {student.name}
                      </span>
                      <span className="publish-student-email">
                        {student.email}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="publish-selected-count">
                  {selectedStudentIds.size} student
                  {selectedStudentIds.size === 1 ? '' : 's'} selected
                </p>
              </>
            )}
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={() => setPublishModalStep('choose')}
                disabled={publishingId === examToPublish.assessment_id}
              >
                Back
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleConfirmPublishSelected}
                disabled={
                  publishingId === examToPublish.assessment_id ||
                  selectedStudentIds.size === 0 ||
                  isLoadingStudents
                }
              >
                {publishingId === examToPublish.assessment_id
                  ? 'Publishing...'
                  : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {examToPublish && publishModalStep === 'choose-new-students' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Add New Students</h2>
            <p>
              Choose which students to publish{' '}
              <strong>{examToPublish.title}</strong> to.
            </p>
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
            {isLoadingStudents ? (
              <p>Loading students...</p>
            ) : studentsList.length === 0 ? (
              <p>
                All students can access <strong>{examToPublish.title}</strong>
              </p>
            ) : (
              <div className="publish-students-list">
                {studentsList.map((student) => (
                  <label key={student.user_id} className="publish-student-row">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.has(student.user_id)}
                      onChange={() => handleToggleStudent(student.user_id)}
                    />
                    <span className="publish-student-name">{student.name}</span>
                    <span className="publish-student-email">
                      {student.email}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={resetPublishModal}
                disabled={publishingId === examToPublish.assessment_id}
              >
                Cancel
              </button>
              {studentsList.length > 0 && (
                <button
                  type="button"
                  className="remove-modal-btn remove-modal-btn--save"
                  onClick={handleConfirmPublishSelected}
                  disabled={
                    publishingId === examToPublish.assessment_id ||
                    selectedStudentIds.size === 0
                  }
                >
                  {publishingId === examToPublish.assessment_id
                    ? 'Saving...'
                    : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {examToClose && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Close Exam</h2>
            <p>
              Closing will mark <strong>{examToClose.title}</strong> as Missing
              for students who did not submit.
            </p>
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={() => {
                  setExamToClose(null)
                  setActionErrMessage('')
                }}
                disabled={closingId === examToClose.assessment_id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm"
                onClick={handleConfirmClose}
                disabled={closingId === examToClose.assessment_id}
              >
                {closingId === examToClose.assessment_id
                  ? 'Closing...'
                  : 'Close Exam'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && examToEdit && canManage && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Edit Exam</h2>
            <p>
              Are you sure you want to edit <strong>{examToEdit.title}</strong>?
            </p>
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleConfirmEdit}
              >
                Edit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && examToDelete && canManage && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Delete Exam</h2>
            <p>
              Are you sure you want to delete{' '}
              <strong>{examToDelete.title}</strong>?
            </p>
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleConfirmDelete}
              >
                Delete Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllExamsPage
