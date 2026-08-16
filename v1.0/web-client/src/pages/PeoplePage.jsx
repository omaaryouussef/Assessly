import React, { useState, useEffect, useCallback } from 'react'
import { getApiBase } from '../config/api'
import { useParams } from 'react-router-dom'
import { useAuth } from '../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPeopleGroup,
  faCircleUser,
  faTrash,
  faPlus,
} from '@fortawesome/free-solid-svg-icons'
import LoadingPage from '../components/LoadingPage'
function PeopleRow({ person, isInstructorUser, onRequestRemove }) {
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
  const [taList, setTaList] = useState([])
  const [instructor, setInstructor] = useState(null)
  const [personToRemove, setPersonToRemove] = useState(null)
  const [addMode, setAddMode] = useState(null)
  const [aucId, setAucId] = useState('')
  const [removeErrMessage, setRemoveErrMessage] = useState('')
  const [addErrMessage, setAddErrMessage] = useState('')
  const [isRemoving, setIsRemoving] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchPeople = useCallback(async () => {
    if (!courseId || !token) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${getApiBase()}/api/courses/people/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!response.ok) throw new Error('Failed to fetch people.')
      const data = await response.json()
      setPeopleList(data.people ?? [])
      setTaList(data.tas ?? [])
      setInstructor(data.instructor ?? null)
    } catch (error) {
      console.error('Failed to fetch people.', error)
    } finally {
      setIsLoading(false)
    }
  }, [courseId, token])

  useEffect(() => {
    fetchPeople()
  }, [fetchPeople])

  if (isLoading) {
    return <LoadingPage message="Loading people…" />
  }

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

    const isTa = personToRemove.role === 'TA'
    const endpoint = isTa
      ? `${getApiBase()}/api/courses/remove-ta/${courseId}`
      : `${getApiBase()}/api/courses/remove/${courseId}`
    const body = isTa
      ? { taId: personToRemove.user_id }
      : { studentId: personToRemove.user_id }

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to remove ${isTa ? 'TA' : 'student'}`,
        )
      }

      setPersonToRemove(null)
      await fetchPeople()
    } catch (error) {
      console.error(`Failed to remove ${isTa ? 'TA' : 'student'}`, error)
      setRemoveErrMessage(
        error.message || `Failed to remove ${isTa ? 'TA' : 'student'}`,
      )
    } finally {
      setIsRemoving(false)
    }
  }

  const handleOpenAddModal = (mode) => {
    setAddErrMessage('')
    setAucId('')
    setAddMode(mode)
  }

  const handleCancelAdd = () => {
    setAddErrMessage('')
    setAucId('')
    setAddMode(null)
  }

  const handleConfirmAdd = async (e) => {
    e.preventDefault()
    if (!courseId || !addMode) return

    setAddErrMessage('')

    if (!aucId.trim()) {
      setAddErrMessage('University ID is required')
      return
    }

    setIsAdding(true)

    const isTa = addMode === 'ta'
    const endpoint = isTa
      ? `${getApiBase()}/api/courses/add-ta/${courseId}`
      : `${getApiBase()}/api/courses/add/${courseId}`

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ aucId: aucId.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(
          data.error || `Failed to add ${isTa ? 'TA' : 'student'}`,
        )
      }

      setAddMode(null)
      setAucId('')
      await fetchPeople()
    } catch (error) {
      console.error(`Failed to add ${isTa ? 'TA' : 'student'}`, error)
      setAddErrMessage(
        error.message || `Failed to add ${isTa ? 'TA' : 'student'}`,
      )
    } finally {
      setIsAdding(false)
    }
  }

  const isInstructorUser = user?.role === 'INSTRUCTOR'
  const removingTa = personToRemove?.role === 'TA'
  const addingTa = addMode === 'ta'

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
            {taList.map((person) => (
              <PeopleRow
                key={person.user_id}
                person={person}
                isInstructorUser={isInstructorUser}
                onRequestRemove={handleRequestRemove}
              />
            ))}
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
          <div className="people-list-button-row">
            <button
              type="button"
              className="add-student-button"
              onClick={() => handleOpenAddModal('ta')}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add TA
            </button>
            <button
              type="button"
              className="add-student-button"
              onClick={() => handleOpenAddModal('student')}
            >
              <FontAwesomeIcon icon={faPlus} />
              Add Student
            </button>
          </div>
        )}
      </div>

      {personToRemove && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Remove {removingTa ? 'TA' : 'Student'}</h2>
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

      {addMode && (
        <div className="remove-modal-backdrop">
          <div className="remove-modal">
            <h2>Add {addingTa ? 'TA' : 'Student'}</h2>
            <p>
              Enter the {addingTa ? "TA's" : "student's"} university ID to{' '}
              {addingTa ? 'assign them to' : 'enroll them in'} this course.
            </p>
            <form onSubmit={handleConfirmAdd}>
              <div className="people-modal-field">
                <label htmlFor="person-auc-id">University ID</label>
                <input
                  type="text"
                  id="person-auc-id"
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
                  {isAdding
                    ? 'Adding...'
                    : `Add ${addingTa ? 'TA' : 'Student'}`}
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
