import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuildingColumns } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../components/auth/AuthWrapper'

function ForgotPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
    }
  }, [location.state?.email])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email.trim()) {
      setErrorMessage('Email is required.')
      return
    }

    setErrorMessage('')
    setSubmitting(true)
    try {
      await forgotPassword(email.trim())
      navigate(
        `/verify-email?purpose=reset&email=${encodeURIComponent(email.trim())}`
      )
    } catch (error) {
      setErrorMessage(error.message || 'Failed to send password reset email')
    } finally {
      setSubmitting(false)
    }
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
          <h3>Forgot password</h3>
          <p>Enter your email and we will send a reset code</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email">University Email</label>
            <div className="input-icon-wrap email-input-wrap">
              <input
                type="email"
                id="email"
                placeholder="person@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="error-message">{errorMessage}</div>
          ) : null}

          <div className="auth-buttons">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset code'}
            </button>
          </div>
        </form>

        <p className="register-footer">
          Remembered your password?
          <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
