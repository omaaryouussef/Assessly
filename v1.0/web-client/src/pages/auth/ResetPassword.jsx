import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBuildingColumns,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../components/auth/AuthWrapper'

const RESET_TOKEN_KEY = 'password_reset_token'

function ResetPassword() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const tokenFromState = location.state?.resetToken
    if (tokenFromState) {
      sessionStorage.setItem(RESET_TOKEN_KEY, tokenFromState)
      setReady(true)
      return
    }

    if (sessionStorage.getItem(RESET_TOKEN_KEY)) {
      setReady(true)
      return
    }

    navigate('/forgot-password', { replace: true })
  }, [location.state, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!password || !confirmPassword) {
      setErrorMessage('All fields are required.')
      return
    }
    if (password.length < 6) {
      setErrorMessage('Password should be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setErrorMessage('')
    setSubmitting(true)
    try {
      await resetPassword(password)
      navigate('/login', { replace: true })
    } catch (error) {
      setErrorMessage(error.message || 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  if (!ready) {
    return null
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
          <h3>Reset your password</h3>
          <p>Choose a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="password">New password</label>
            <div className="input-icon-wrap password-input-wrap password-input-wrap--toggle">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="................"
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
            <label htmlFor="confirmPassword">Confirm password</label>
            <div className="input-icon-wrap password-input-wrap password-input-wrap--toggle">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                placeholder="................"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword ? 'Hide password' : 'Show password'
                }
              >
                <FontAwesomeIcon
                  icon={showConfirmPassword ? faEyeSlash : faEye}
                />
              </button>
            </div>
          </div>

          {errorMessage ? (
            <div className="error-message">{errorMessage}</div>
          ) : null}

          <div className="auth-buttons">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Resetting…' : 'Reset password'}
            </button>
          </div>
        </form>

        <p className="register-footer">
          Back to
          <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
