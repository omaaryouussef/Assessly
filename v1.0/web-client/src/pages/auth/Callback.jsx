import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBuildingColumns } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../components/auth/AuthWrapper'

function Callback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { acceptToken } = useAuth()
  const [message, setMessage] = useState('Signing you in…')
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const token = searchParams.get('token')
    if (!token) {
      navigate('/login?error=google_auth_failed', { replace: true })
      return
    }

    ;(async () => {
      try {
        await acceptToken(token)
        navigate('/courses', { replace: true })
      } catch {
        setMessage('Sign-in failed. Redirecting…')
        navigate('/login?error=google_auth_failed', { replace: true })
      }
    })()
  }, [acceptToken, navigate, searchParams])

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
          <h3>Almost there</h3>
          <p>{message}</p>
        </div>
      </div>
    </div>
  )
}

export default Callback
