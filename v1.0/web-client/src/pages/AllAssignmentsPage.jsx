import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardList,
  faPlus,
  faFile,
  faCode,
  faFileLines,
  faTerminal,
  faCalendarDays,
  faPen,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { useParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthWrapper'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

const ASSIGNMENT_ICONS = {
  CODING: faCode,
  ESSAY: faFileLines,
  MCQ: faTerminal,
}

function AssignmentRow({
  assignment,
  canManage,
  onPublishClick,
  isPublishing,
  currentDateTime,
  setShowEditModal,
  setShowDeleteModal,
  setAssignmentToEdit,
  setAssignmentToDelete,
  onRowClick,
}) {
  const icon = ASSIGNMENT_ICONS[assignment.question_type] ?? faFile
  const dueDate = assignment.due_date
    ? new Date(assignment.due_date).toLocaleDateString()
    : ''
  const dueTime = assignment.due_date
    ? new Date(assignment.due_date).toLocaleTimeString()
    : ''
  const isPastDue = currentDateTime > new Date(assignment.due_date)
  return (
    <div className="assignment-row" onClick={assignment.is_published && !assignment.is_closed ? onRowClick : undefined}>
      <div className="assignment-row-icon" aria-hidden="true">
        <FontAwesomeIcon icon={icon} />
      </div>
      <div className="assignment-row-body">
        <h3 className="assignment-row-title">{assignment.title}</h3>
        <p className="assignment-row-meta">
          <FontAwesomeIcon
            icon={faCalendarDays}
            className="assignment-meta-icon"
          />
          {assignment.due_date ? `Due ${dueDate} ${dueTime} | ` : ''}
          {assignment.max_grade} pts
        </p>
        {canManage && (
          <div className="assignment-row-action-buttons">
            <button
              type="button"
              className="assignment-row-action-btn"
              onClick={() => {
                setShowEditModal(true)
                setAssignmentToEdit(assignment)
              }}
            >
              <FontAwesomeIcon icon={faPen} />
            </button>
            <button
              type="button"
              className="assignment-row-action-btn"
              onClick={() => {
                setShowDeleteModal(true)
                setAssignmentToDelete(assignment)
              }}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        )}
      </div>
      <div className="assignment-row-actions">
        <span
          className={`assignment-status-badge ${
            assignment.is_published
              ? 'assignment-status-badge--published'
              : 'assignment-status-badge--unpublished'
          }`}
        >
          {assignment.is_published ? 'Published' : 'Not Published'}
        </span>
        {isPastDue && (
          <span className="assignment-status-badge assignment-status-badge--past-due">
            Past Due
          </span>
        )}
        {canManage && (
          <button
            type="button"
            className={`assignment-publish-btn ${
              assignment.is_published ? 'assignment-publish-btn--unpublish' : ''
            }`}
            onClick={() => onPublishClick(assignment)}
            disabled={isPublishing}
          >
            {isPublishing
              ? 'Saving...'
              : assignment.is_published
                ? 'Unpublish'
                : 'Publish'}
          </button>
        )}
      </div>
    </div>
  )
}

function AllAssignmentsPage() {
  const navigate = useNavigate()
  const { courseId } = useParams()
  const { user, token } = useAuth()
  const [assignmentsList, setAssignmentsList] = useState([])
  const [publishingId, setPublishingId] = useState(null)
  const [assignmentToPublish, setAssignmentToPublish] = useState(null)
  const [publishErrMessage, setPublishErrMessage] = useState('')
  const [currentDateTime, setCurrentDateTime] = useState(new Date())
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [assignmentToEdit, setAssignmentToEdit] = useState(null)
  const [assignmentToDelete, setAssignmentToDelete] = useState(null)
  const [deleteErrMessage, setDeleteErrMessage] = useState('')
  const canManage = user?.role === 'INSTRUCTOR' || user?.role === 'TA'

  const fetchAssignments = async () => {
    const response = await fetch(
      `${API_BASE}/api/assessments/assignments/${courseId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    if (!response.ok) throw new Error('Failed to fetch assignments')
    const data = await response.json()
    setAssignmentsList(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    if (!courseId || !token) return
    setCurrentDateTime(new Date())
    fetchAssignments().catch((error) => {
      console.error('Failed to fetch assignments', error)
      setAssignmentsList([])
    })
  }, [courseId, token])

  const updatePublishState = async (assessmentId, nextPublished) => {
    setPublishingId(assessmentId)
    setPublishErrMessage('')

    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${assessmentId}/publish`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_published: nextPublished }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update assignment')
      }

      setAssignmentsList((prev) =>
        prev.map((item) =>
          item.assessment_id === assessmentId ? { ...item, ...data } : item
        )
      )
      setAssignmentToPublish(null)
    } catch (error) {
      console.error('Failed to update assignment publish state', error)
      setPublishErrMessage(error.message || 'Failed to update assignment')
    } finally {
      setPublishingId(null)
    }
  }

  const handlePublishClick = (assignment) => {
    if (assignment.is_published) {
      updatePublishState(assignment.assessment_id, false)
      return
    }

    setPublishErrMessage('')
    setAssignmentToPublish(assignment)
  }

  const handleCancelPublish = () => {
    setPublishErrMessage('')
    setAssignmentToPublish(null)
  }

  const handleConfirmPublish = () => {
    if (!assignmentToPublish) return
    updatePublishState(assignmentToPublish.assessment_id, true)
  }

  // to do: handle the editing in the assessment studio after I finish it.
  const handleConfirmEdit = () => {
    if (!assignmentToEdit) return
    navigate(`/course/${courseId}/assessment-studio`, {
      state: { assessmentToEdit: assignmentToEdit },
    })
  }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return
    try {
      const response = await fetch(
        `${API_BASE}/api/assessments/${assignmentToDelete.assessment_id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!response.ok) throw new Error('Failed to delete assignment')
      const data = await response.json()
      setAssignmentsList((prev) =>
        prev.filter(
          (assignment) =>
            assignment.assessment_id !== assignmentToDelete.assessment_id
        )
      )
      setAssignmentToDelete(null)
    } catch (error) {
      console.error('Failed to delete assignment', error)
      setDeleteErrMessage(error.message || 'Failed to delete assignment')
    }
  }
  return (
    <div className="assignments-page-container">
      <div className="course-special-header">
        <FontAwesomeIcon
          icon={faClipboardList}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p>Assignments</p>
      </div>

      {canManage && (
        <div className="assignments-toolbar">
          <button
            type="button"
            className="create-assignment-button"
            onClick={() =>
              navigate(`/course/${courseId}/assessment-studio`, {
                state: { assessmentType: 'ASSIGNMENT' },
              })
            }
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Create Assignment</span>
          </button>
        </div>
      )}

      {assignmentsList.length > 0 ? (
        <div className="assignments-list-card">
          {assignmentsList
            .filter((assignment) => canManage || assignment.is_published)
            .map((assignment) => (
              
              <AssignmentRow
                key={assignment.assessment_id}
                assignment={assignment}
                canManage={canManage}
                onPublishClick={handlePublishClick}
                isPublishing={publishingId === assignment.assessment_id}
                currentDateTime={currentDateTime}
                setShowEditModal={setShowEditModal}
                setShowDeleteModal={setShowDeleteModal}
                setAssignmentToEdit={setAssignmentToEdit}
                setAssignmentToDelete={setAssignmentToDelete}
                onRowClick={
                  user?.role === 'STUDENT'
                    ? () =>
                        navigate(`/course/${courseId}/take-assessment`, {
                          state: { assessmentToTake: assignment },
                        })
                    : undefined
                }
              />
            ))}
        </div>
      ) : (
        <div className="assignments-empty">
          <FontAwesomeIcon icon={faFile} />
          <span>No assignments yet</span>
        </div>
      )}

      {assignmentToPublish && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Publish Assignment</h2>
            <p>
              Are you sure you want to publish{' '}
              <strong>{assignmentToPublish.title}</strong>? Students will be
              able to view and submit this assignment.
            </p>
            {publishErrMessage && (
              <p className="error-message">{publishErrMessage}</p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={handleCancelPublish}
                disabled={publishingId === assignmentToPublish.assessment_id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm-primary"
                onClick={handleConfirmPublish}
                disabled={publishingId === assignmentToPublish.assessment_id}
              >
                {publishingId === assignmentToPublish.assessment_id
                  ? 'Publishing...'
                  : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && assignmentToEdit && canManage && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Edit Assignment</h2>
            <p>
              Are you sure you want to edit{' '}
              <strong>{assignmentToEdit.title}</strong>?
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
                onClick={() => handleConfirmEdit()}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && assignmentToDelete && canManage && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Delete Assignment</h2>
            <p>
              Are you sure you want to delete{' '}
              <strong>{assignmentToDelete.title}</strong>?
            </p>
            {deleteErrMessage && (
              <p className="error-message">{deleteErrMessage}</p>
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
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AllAssignmentsPage
