import React, { useState, useEffect, useCallback, use } from 'react'
import { NavLink, useParams, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCircleQuestion,
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


const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

const QUIZ_ICONS = {
  CODING: faCode,
  ESSAY: faFileLines,
  MCQ: faTerminal,
}

function QuizRow({
  quiz,
  canManage,
  onPublishClick,
  onPublishNewStudentsClick,
  onCloseClick,
  onReopenClick,
  isPublishing,
  isClosing,
  setShowEditModal,
  setShowDeleteModal,
  setQuizToEdit,
  setQuizToDelete,
  onRowClick,
}) {
  const icon = QUIZ_ICONS[quiz.question_type] ?? faFile
  const isPublished = quiz.is_published;
  const status = getAssessmentStatus(quiz)
  return (
    <div className="assignment-row" onClick={quiz.is_published && !quiz.is_closed && status === 'available' ? onRowClick : undefined}>
      <div className="assignment-row-icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className="assignment-row-body">
        <h3 className="assignment-row-title">{quiz.title}</h3>
        <p className="assignment-row-meta">
          <FontAwesomeIcon icon={faClock} className="assignment-meta-icon" />
          {quiz.duration} min | {quiz.max_grade} pts
          {quiz.due_date ? (
            <>
              {' '}
              |{' '}
              <FontAwesomeIcon
                icon={faCalendarDays}
                className="assignment-meta-icon"
              />{' '}
              {formatDueDateTimeLabel(quiz.due_date, quiz.due_time)}
            </>
          ) : null}
        </p>
        {canManage && (
          <div className="assignment-row-action-buttons">
            {!isPublished && (
              <button
                type="button"
                className="assignment-row-action-btn assignment-row-action-btn--edit"
                aria-label={`Edit ${quiz.title}`}
                onClick={() => {
                  setShowEditModal(true)
                  setQuizToEdit(quiz)
                }}
              >
                <FontAwesomeIcon icon={faPen} />
              </button>
            )}
            <button
              type="button"
              className="assignment-row-action-btn assignment-row-action-btn--delete"
              aria-label={`Delete ${quiz.title}`}
              onClick={() => {
                setShowDeleteModal(true)
                setQuizToDelete(quiz)
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
                quiz.is_published
                  ? 'assignment-status-badge--published'
                  : 'assignment-status-badge--unpublished'
              }`}
            >
              {quiz.is_published ? 'Published' : 'Not Published'}
            </span>
            {quiz.is_closed && (
              <span className="assignment-status-badge assignment-status-badge--closed">
                Closed
              </span>
            )}
            <button
              type="button"
              className={`assignment-publish-btn ${
                quiz.is_published ? 'assignment-publish-btn--unpublish' : ''
              }`}
              onClick={() => onPublishClick(quiz)}
              disabled={isPublishing || isClosing}
            >
              {isPublishing
                ? 'Saving...'
                : quiz.is_published
                  ? 'Unpublish'
                  : 'Publish'}
            </button>
            {quiz.is_published && (
              <>
                {quiz.is_closed ? (
                  <button
                    type="button"
                    className="quiz-close-btn quiz-close-btn--reopen"
                    onClick={() => onReopenClick(quiz)}
                    disabled={isPublishing || isClosing}
                  >
                    {isClosing ? 'Saving...' : 'Reopen Quiz'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="quiz-close-btn"
                    onClick={() => onCloseClick(quiz)}
                    disabled={isPublishing || isClosing || !quiz.is_published}
                  >
                    Close Quiz
                  </button>
                )}
              </>
            )}
            {quiz.is_published && !quiz.is_closed && (
              <button
                type="button"
                className="assignment-add-students-btn"
                onClick={() => onPublishNewStudentsClick(quiz)}
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

function AllQuizzesPage() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { user, token } = useAuth()
  const [quizzesList, setQuizzesList] = useState([])
  const [publishingId, setPublishingId] = useState(null)
  const [closingId, setClosingId] = useState(null)
  const [quizToPublish, setQuizToPublish] = useState(null)
  const [publishModalStep, setPublishModalStep] = useState(null)
  const [quizToClose, setQuizToClose] = useState(null)
  const [studentsList, setStudentsList] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [actionErrMessage, setActionErrMessage] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [quizToEdit, setQuizToEdit] = useState(null)
  const [quizToDelete, setQuizToDelete] = useState(null)
  const canManage = user?.role === 'INSTRUCTOR' || user?.role === 'TA'

  const fetchQuizzes = useCallback(async () => {
    const response = await fetch(
      `${API_BASE}/api/assessments/quizzes/${courseId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.ok) throw new Error('Failed to fetch quizzes')
    const data = await response.json()
    setQuizzesList(Array.isArray(data) ? data : [])
  }, [courseId, token])

  const fetchStudents = useCallback(async () => {
    setIsLoadingStudents(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/courses/people/${courseId}`,
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
    async (quiz) => {
      setIsLoadingStudents(true)
      try {
        const response = await fetch(
          `${API_BASE}/api/courses/people/${courseId}`,
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
          `${API_BASE}/api/assessments/allowed-students/${quiz.assessment_id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        if (!allowedResponse.ok) {
          throw new Error('Failed to fetch allowed students')
        }
        const allowedData = await allowedResponse.json()
        console.log(allowedData)
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
    fetchQuizzes().catch((error) => {
      console.error('Failed to fetch quizzes', error)
      setQuizzesList([])
    })
  }, [courseId, token, fetchQuizzes])

  const updateQuizInList = (updatedQuiz) => {
    setQuizzesList((prev) =>
      prev.map((item) =>
        item.assessment_id === updatedQuiz.assessment_id
          ? { ...item, ...updatedQuiz }
          : item
      )
    )
  }

  const resetPublishModal = () => {
    setQuizToPublish(null)
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
        `${API_BASE}/api/assessments/${assessmentId}/publish`,
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
        throw new Error(data.error || 'Failed to update quiz')
      }

      updateQuizInList(data)
      resetPublishModal()
    } catch (error) {
      console.error('Failed to update quiz publish state', error)
      setActionErrMessage(error.message || 'Failed to update quiz')
    } finally {
      setPublishingId(null)
    }
  }

  const updateCloseState = async (assessmentId, isClosed) => {
    setClosingId(assessmentId)
    setActionErrMessage('')

    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${assessmentId}/close`,
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
        throw new Error(data.error || 'Failed to update quiz')
      }

      updateQuizInList(data)
      setQuizToClose(null)
      setActionErrMessage('')
    } catch (error) {
      console.error('Failed to update quiz close state', error)
      setActionErrMessage(error.message || 'Failed to update quiz')
    } finally {
      setClosingId(null)
    }
  }

  const handlePublishClick = (quiz) => {
    if (quiz.is_published) {
      updatePublishState(quiz.assessment_id, { is_published: false })
      return
    }

    setActionErrMessage('')
    setQuizToPublish(quiz)
    setPublishModalStep('choose')
  }

  const handlePublishNewStudentsClick = (quiz) => {
    fetchStudentForAdding(quiz)
    setActionErrMessage('')
    setQuizToPublish(quiz)
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
    if (!quizToPublish) return
    updatePublishState(quizToPublish.assessment_id, {
      is_published: true,
      publish_mode: 'all',
    })
  }

  const handleConfirmPublishSelected = () => {
    if (!quizToPublish || selectedStudentIds.size === 0) return
    updatePublishState(quizToPublish.assessment_id, {
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

  const handleCloseClick = (quiz) => {
    setActionErrMessage('')
    setQuizToClose(quiz)
  }

  const handleConfirmClose = () => {
    if (!quizToClose) return
    updateCloseState(quizToClose.assessment_id, true)
  }

  const handleReopenClick = (quiz) => {
    updateCloseState(quiz.assessment_id, false)
  }

  const allStudentsSelected =
    studentsList.length > 0 && selectedStudentIds.size === studentsList.length

  const handleConfirmEdit = () => {
    if (!quizToEdit) return
    navigate(`/course/${courseId}/assessment-studio`, {state: {assessmentToEdit: quizToEdit}})
  }

  const handleConfirmDelete = async () => {
    if (!quizToDelete) return
    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${quizToDelete.assessment_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!response.ok) throw new Error('Failed to delete quiz')
      const data = await response.json()
      setQuizzesList((prev) =>
        prev.filter((quiz) => quiz.assessment_id !== quizToDelete.assessment_id)
      )
      setQuizToDelete(null)
      setShowDeleteModal(false)
    } catch (error) {
      console.error('Failed to delete quiz', error)
      setActionErrMessage(error.message || 'Failed to delete quiz')
    }
  }
  return (
    <div className="assignments-page-container">
      <div className="course-special-header">
        <FontAwesomeIcon
          icon={faCircleQuestion}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p>Quizzes</p>
      </div>

      {canManage && (
        <div className="assignments-toolbar">
            <button type="button" className="create-assignment-button" onClick={() => navigate(`/course/${courseId}/assessment-studio`, {state: {assessmentType: 'QUIZ'}})}>
              <FontAwesomeIcon icon={faPlus} />
              <span>Create Quiz</span>
            </button>
        </div>
      )}
      {quizzesList.length > 0 ? (
        <div className="assignments-list-card">
          {quizzesList.map((quiz) => (
            <QuizRow
              key={quiz.assessment_id}
              quiz={quiz}
              canManage={canManage}
              onPublishClick={handlePublishClick}
              onPublishNewStudentsClick={handlePublishNewStudentsClick}
              onCloseClick={handleCloseClick}
              onReopenClick={handleReopenClick}
              isPublishing={publishingId === quiz.assessment_id}
              isClosing={closingId === quiz.assessment_id}
              setShowEditModal={setShowEditModal}
              setShowDeleteModal={setShowDeleteModal}
              setQuizToEdit={setQuizToEdit}
              setQuizToDelete={setQuizToDelete}
              onRowClick = {
                user?.role === 'STUDENT' ? () => {
                  navigate(
                    `/course/${courseId}/take-assessment/${quiz.assessment_id}`,
                    { state: { assessmentToTake: quiz } }
                  )
                } : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="assignments-empty">
          <FontAwesomeIcon icon={faFile} />
          <span>No quizzes yet</span>
        </div>
      )}

      {quizToPublish && publishModalStep === 'choose' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Publish Quiz</h2>
            <p>
              Choose how to publish <strong>{quizToPublish.title}</strong>.
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

      {quizToPublish && publishModalStep === 'confirm-all' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Publish to All Students</h2>
            <p>
              Are you sure you want to publish{' '}
              <strong>{quizToPublish.title}</strong> to all enrolled students?
            </p>
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={() => setPublishModalStep('choose')}
                disabled={publishingId === quizToPublish.assessment_id}
              >
                Back
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleConfirmPublishAll}
                disabled={publishingId === quizToPublish.assessment_id}
              >
                {publishingId === quizToPublish.assessment_id
                  ? 'Publishing...'
                  : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {quizToPublish && publishModalStep === 'select-students' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal publish-students-modal">
            <h2>Select Students</h2>
            <p>
              Choose which students can access{' '}
              <strong>{quizToPublish.title}</strong>.
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
                disabled={publishingId === quizToPublish.assessment_id}
              >
                Back
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleConfirmPublishSelected}
                disabled={
                  publishingId === quizToPublish.assessment_id ||
                  selectedStudentIds.size === 0 ||
                  isLoadingStudents
                }
              >
                {publishingId === quizToPublish.assessment_id
                  ? 'Publishing...'
                  : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {quizToPublish && publishModalStep === 'choose-new-students' && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Add New Students</h2>
            <p>
              Choose which students to publish{' '}
              <strong>{quizToPublish.title}</strong> to.
            </p>
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
            {studentsList.length === 0 ? (
              <p>
                All students can access{' '}
                <strong>{quizToPublish.title}</strong>
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
                disabled={publishingId === quizToPublish.assessment_id}
              >
                Cancel
              </button>
              {studentsList.length > 0 && (
                <button
                  type="button"
                  className="remove-modal-btn remove-modal-btn--save"
                  onClick={handleConfirmPublishSelected}
                  disabled={
                    publishingId === quizToPublish.assessment_id ||
                    selectedStudentIds.size === 0
                  }
                >
                  {publishingId === quizToPublish.assessment_id
                    ? 'Saving...'
                    : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {quizToClose && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Close Quiz</h2>
            <p>
              Closing will mark <strong>{quizToClose.title}</strong> as Missing
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
                  setQuizToClose(null)
                  setActionErrMessage('')
                }}
                disabled={closingId === quizToClose.assessment_id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm"
                onClick={handleConfirmClose}
                disabled={closingId === quizToClose.assessment_id}
              >
                {closingId === quizToClose.assessment_id
                  ? 'Closing...'
                  : 'Close Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && quizToEdit && canManage && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Edit Quiz</h2>
            <p>
              Are you sure you want to edit <strong>{quizToEdit.title}</strong>?
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
                Edit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && quizToDelete && canManage && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Delete Quiz</h2>
            <p>
              Are you sure you want to delete{' '}
              <strong>{quizToDelete.title}</strong>?
            </p>
            {actionErrMessage && (
              <p className="error-message">{actionErrMessage}</p>
            )}
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
                disabled={publishingId === quizToDelete.assessment_id}
              >
                {publishingId === quizToDelete.assessment_id
                  ? 'Deleting...'
                  : 'Delete Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllQuizzesPage
