import React, { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuildingColumns } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../components/auth/AuthWrapper'

function decodePendingPayload(token) {
  if (!token) return null
  try {
    const base64 = token.split('.')[1]
    if (!base64) return null
    const normalized = base64.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '='
    )
    const json = atob(padded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

function CompleteProfile() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { completeGoogleProfile } = useAuth()

  const pendingToken = searchParams.get('pending') || ''
  const pending = useMemo(
    () => decodePendingPayload(pendingToken),
    [pendingToken]
  )

  const [auc_id, setAucId] = useState('')
  const [department, setDepartment] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const email = pending?.email || ''
  const name = pending?.name || ''
  const hasValidPending =
    Boolean(pendingToken) &&
    pending?.purpose === 'google_complete' &&
    Boolean(email)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!hasValidPending) {
      setErrorMessage('Your Google sign-in session expired. Please try again.')
      return
    }
    if (!auc_id || !department.trim()) {
      setErrorMessage('University ID and department are required.')
      return
    }
    if (auc_id.length !== 9) {
      setErrorMessage('University ID must be exactly 9 characters.')
      return
    }

    setErrorMessage('')
    setSubmitting(true)
    try {
      await completeGoogleProfile(pendingToken, {
        auc_id,
        department: department.trim(),
      })
      navigate('/courses')
    } catch (error) {
      setErrorMessage(
        error.message || 'Could not complete your profile. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!hasValidPending) {
    return (
      <div className="register-container">
        <div className="register-header">
          <div className="register-logo">
            <FontAwesomeIcon
              icon={faBuildingColumns}
              className="login-logo-icon"
            />
            <h1>Assessly</h1>
          </div>
        </div>
        <div className="register-form">
          <div className="form-header-text">
            <h3>Complete your profile</h3>
            <p>Your Google sign-in session is missing or expired.</p>
          </div>
          <p className="error-message">
            Please sign in with Google again to continue.
          </p>
          <p className="register-footer">
            <a href="/login">Back to login</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="register-container">
      <div className="register-header">
        <div className="register-logo">
          <FontAwesomeIcon
            icon={faBuildingColumns}
            className="login-logo-icon"
          />
          <h1>Assessly</h1>
        </div>
      </div>

      <div className="register-form">
        <div className="form-header-text">
          <h3>Complete your profile</h3>
          <p>Finish setting up your student account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-icon-wrap name-input-wrap">
              <input type="text" id="name" value={name} readOnly disabled />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">University Email</label>
            <div className="input-icon-wrap email-input-wrap">
              <input type="email" id="email" value={email} readOnly disabled />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <div className="input-icon-wrap role-input-wrap">
              <input type="text" id="role" value="Student" readOnly disabled />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="id">University ID</label>
            <div className="input-icon-wrap id-input-wrap">
              <input
                type="text"
                placeholder="123456789"
                id="id"
                value={auc_id}
                maxLength={9}
                onChange={(e) => setAucId(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <div className="input-icon-wrap department-input-wrap">
              <input
                type="text"
                placeholder="Computer Science"
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="error-message">{errorMessage}</div>
          ) : null}

          <div className="auth-buttons">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Complete profile'}
            </button>
          </div>
        </form>

        <p className="register-footer">
          Already have an account?
          <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  )
}

export default CompleteProfile
