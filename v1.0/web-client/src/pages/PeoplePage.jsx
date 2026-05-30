import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPeopleGroup,
  faCircleUser,
  faTrash,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL

function PeopleRow({ person, isInstructorUser, onRequestRemove }) {
  const { user } = useAuth()
  const isInstructor = person.role === 'INSTRUCTOR'

  return (
    <tr>
      <td className="people-list-icon-cell">
        <FontAwesomeIcon icon={faCircleUser} className="people-list-icon" />
      </td>
      <td>{person.name}</td>
      <td>{person.email}</td>
      <td>{person.role}</td>
      <td className="people-list-actions-cell">
        {isInstructorUser && !isInstructor && (
          <button
            type="button"
            className="remove-person-button"
            aria-label={`Remove ${person.name}`}
            onClick={() => onRequestRemove(person)}
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        )}
      </td>
    </tr>
  )
}

function PeoplePage() {
  const { token, user } = useAuth()
  const { courseId } = useParams()
  const [peopleList, setPeopleList] = useState([])
  const [instructor, setInstructor] = useState(null)
  const [personToRemove, setPersonToRemove] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [aucId, setAucId] = useState('')
  const [removeErrMessage, setRemoveErrMessage] = useState('')
  const [addErrMessage, setAddErrMessage] = useState('')
  const [isRemoving, setIsRemoving] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const fetchPeople = useCallback(async () => {
    if (!courseId || !token) return

    try {
      const response = await fetch(
        `${API_BASE}/api/courses/people/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!response.ok) throw new Error('Failed to fetch people.')
      const data = await response.json()
      setPeopleList(data.people ?? [])
      setInstructor(data.instructor ?? null)
    } catch (error) {
      console.error('Failed to fetch people.', error)
    }
  }, [courseId, token])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  const handleRequestRemove = (person) => {
    setRemoveErrMessage('')
    setPersonToRemove(person)
  }

  const handleCancelRemove = () => {
    setRemoveErrMessage('')
    setPersonToRemove(null)
  }

  const handleConfirmRemove = async () => {
    if (!personToRemove || !courseId) return

    setRemoveErrMessage('')
    setIsRemoving(true)

    try {
      const response = await fetch(
        `${API_BASE}/api/courses/remove/${courseId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ studentId: personToRemove.user_id }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove student')
      }

      setPersonToRemove(null)
      await fetchPeople()
    } catch (error) {
      console.error('Failed to remove student', error)
      setRemoveErrMessage(error.message || 'Failed to remove student')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleOpenAddModal = () => {
    setAddErrMessage('')
    setAucId('')
    setShowAddModal(true)
  }

  const handleCancelAdd = () => {
    setAddErrMessage('')
    setAucId('')
    setShowAddModal(false)
  }

  const handleConfirmAdd = async (e) => {
    e.preventDefault()
    if (!courseId) return

    setAddErrMessage('')

    if (!aucId.trim()) {
      setAddErrMessage('University ID is required')
      return
    }

    setIsAdding(true)

    try {
      const response = await fetch(`${API_BASE}/api/courses/add/${courseId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aucId: aucId.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add student')
      }

      setShowAddModal(false)
      setAucId('')
      await fetchPeople()
    } catch (error) {
      console.error('Failed to add student', error)
      setAddErrMessage(error.message || 'Failed to add student')
    } finally {
      setIsAdding(false)
    }
  }

  const isInstructorUser = user?.role === 'INSTRUCTOR'

  return (
    <div className="people-page-container">
      <div className="course-special-header">
        <FontAwesomeIcon
          icon={faPeopleGroup}
          className="course-special-header-icon"
        />
        <span> / </span>
        <p>People</p>
      </div>
      <div className="people-list-container">
        <table className="people-list-table">
          <thead>
            <tr>
              <th className="people-list-icon-header" aria-hidden="true" />
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th className="people-list-actions-header" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {instructor && (
              <PeopleRow
                key={instructor.user_id}
                person={instructor}
                isInstructorUser={isInstructorUser}
                onRequestRemove={handleRequestRemove}
              />
            )}
            {peopleList.map((person) => (
              <PeopleRow
                key={person.user_id}
                person={person}
                isInstructorUser={isInstructorUser}
                onRequestRemove={handleRequestRemove}
              />
            ))}
          </tbody>
        </table>
        {isInstructorUser && (
          <button
            type="button"
            className="add-student-button"
            onClick={handleOpenAddModal}
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Student
          </button>
        )}
      </div>

      {personToRemove && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Remove Student</h2>
            <p>
              Are you sure you want to remove{' '}
              <strong>{personToRemove.name}</strong> from this course?
            </p>
            {removeErrMessage && (
              <p className="error-message">{removeErrMessage}</p>
            )}
            <div className="remove-modal-actions">
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--cancel"
                onClick={handleCancelRemove}
                disabled={isRemoving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="remove-modal-btn remove-modal-btn--confirm"
                onClick={handleConfirmRemove}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Add Student</h2>
            <p>Enter the student&apos;s university ID to enroll them in this course.</p>
            <form onSubmit={handleConfirmAdd}>
              <div className="people-modal-field">
                <label htmlFor="student-auc-id">University ID</label>
                <input
                  type="text"
                  id="student-auc-id"
                  name="aucId"
                  placeholder="e.g., 900123456"
                  maxLength={9}
                  value={aucId}
                  onChange={(e) => setAucId(e.target.value)}
                  required
                />
              </div>
              {addErrMessage && (
                <p className="error-message">{addErrMessage}</p>
              )}
              <div className="remove-modal-actions">
                <button
                  type="button"
                  className="remove-modal-btn remove-modal-btn--cancel"
                  onClick={handleCancelAdd}
                  disabled={isAdding}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="remove-modal-btn remove-modal-btn--confirm-primary"
                  disabled={isAdding}
                >
                  {isAdding ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PeoplePage
