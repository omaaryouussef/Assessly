import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBuildingColumns,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../components/auth/AuthWrapper'
import { getApiBase } from '../../config/api'
import LoadingPage from '../../components/LoadingPage'

function AcceptInvite() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { acceptInvite } = useAuth()

  const inviteToken = searchParams.get('token') || ''
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [cPassword, setCPassword] = useState('')
  const [auc_id, setAucId] = useState('')
  const [department, setDepartment] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [loadingInvite, setLoadingInvite] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadInvite() {
      if (!inviteToken) {
        setErrorMessage('Missing invite token.')
        setLoadingInvite(false)
        return
      }

      try {
        const response = await fetch(
          `${getApiBase()}/api/users/invite?token=${encodeURIComponent(inviteToken)}`
        )
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Invalid invite')
        }
        if (!cancelled) {
          setEmail(data.email || '')
          setErrorMessage('')
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error.message || 'Invalid or expired invite.')
        }
      } finally {
        if (!cancelled) setLoadingInvite(false)
      }
    }

    loadInvite()
    return () => {
      cancelled = true
    }
  }, [inviteToken])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!inviteToken) {
      setErrorMessage('Missing invite token.')
      return
    }
    if (!name || !password || !auc_id || !department) {
      setErrorMessage('All fields are required.')
      return
    }
    if (password.length < 6) {
      setErrorMessage('Password should be at least 6 characters long.')
      return
    }
    if (password !== cPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }
    if (auc_id.length !== 9) {
      setErrorMessage('University ID must be exactly 9 characters.')
      return
    }

    setErrorMessage('')
    setSubmitting(true)
    try {
      await acceptInvite(inviteToken, {
        name: name.trim(),
        password,
        auc_id,
        department: department.trim(),
      })
      navigate('/courses')
    } catch (error) {
      setErrorMessage(error.message || 'Could not accept invite.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInvite) {
    return <LoadingPage message="Validating your invite…" />
  }

  if (!email) {
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
            <h3>Instructor invitation</h3>
            <p>This invite link is invalid or expired.</p>
          </div>
          {errorMessage ? (
            <div className="error-message">{errorMessage}</div>
          ) : null}
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
          <h3>Accept instructor invite</h3>
          <p>Create your instructor account to join Assessly</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-icon-wrap email-input-wrap">
              <input type="email" id="email" value={email} readOnly disabled />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <div className="input-icon-wrap role-input-wrap">
              <input
                type="text"
                id="role"
                value="Instructor"
                readOnly
                disabled
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-icon-wrap name-input-wrap">
              <input
                type="text"
                id="name"
                placeholder="Your Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrap password-input-wrap password-input-wrap--toggle">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="..................."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cPassword">Confirm password</label>
            <div className="input-icon-wrap password-input-wrap password-input-wrap--toggle">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="cPassword"
                placeholder="..................."
                value={cPassword}
                onChange={(e) => setCPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
              >
                <FontAwesomeIcon
                  icon={showConfirmPassword ? faEyeSlash : faEye}
                />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="id">University ID</label>
            <div className="input-icon-wrap id-input-wrap">
              <input
                type="text"
                id="id"
                placeholder="123456789"
                maxLength={9}
                value={auc_id}
                onChange={(e) => setAucId(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="department">Department</label>
            <div className="input-icon-wrap department-input-wrap">
              <input
                type="text"
                id="department"
                placeholder="Computer Science"
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
              {submitting ? 'Creating account…' : 'Create instructor account'}
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

export default AcceptInvite
