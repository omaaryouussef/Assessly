import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuildingColumns } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../components/auth/AuthWrapper'

function VerifyEmail() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmail } = useAuth()

  const emailFromState = location.state?.email || ''
  const [email, setEmail] = useState(emailFromState)
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !code.trim()) {
      setErrorMessage('Email and verification code are required.')
      return
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setErrorMessage('Enter the 6-digit code from your email.')
      return
    }

    setErrorMessage('')
    setSubmitting(true)
    try {
      await verifyEmail(email.trim(), code.trim())
      navigate('/courses')
    } catch (error) {
      setErrorMessage(
        error.message || 'Verification failed. Please try again.'
      )
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
          <h3>Verify your email</h3>
          <p>
            {email
              ? `Enter the 6-digit code sent to ${email}`
              : 'Enter your email and the 6-digit code we sent you'}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {!emailFromState ? (
            <div className="form-group">
              <label htmlFor="email">University Email</label>
              <div className="input-icon-wrap email-input-wrap">
                <input
                  type="email"
                  id="email"
                  placeholder="person@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="form-group">
            <label htmlFor="code">Verification code</label>
            <div className="input-icon-wrap code-input-wrap">
              <input
                type="text"
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="error-message">{errorMessage}</div>
          ) : null}

          <div className="auth-buttons">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Verifying…' : 'Verify and continue'}
            </button>
          </div>
        </form>

        <p className="register-footer">
          Already verified?
          <a href="/login">Log in</a>
        </p>
      </div>
    </div>
  )
}

export default VerifyEmail
