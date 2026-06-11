import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../components/auth/AuthWrapper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import {
  faBuildingColumns,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons'

function RegisterView() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cPassword, setCPassword] = useState('')
  const [name, setName] = useState('')
  const [auc_id, setID] = useState('')
  const [role, setRole] = useState('INSTRUCTOR')
  const [errorMessage, setErrorMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const validateEmail = (email) => {
    return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)
  }

  const confirmPassword = (password, cPassword) => {
    return password == cPassword
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email || !password || !name || !auc_id || !role) {
      setErrorMessage('All fields are required.')
      return; 
    } else if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.')
      return;
    } else if (password.length < 6) {
      setErrorMessage('Password should be at least 6 characters long.')
      return;
    } else if (!confirmPassword(password, cPassword)) {
      setErrorMessage('Passwords do not match.')
      return;
    } else if (auc_id.length < 9) {
      setErrorMessage('University ID should be at least 9 characters long.')
      return;
    } else {
      setErrorMessage('')
    }

    try {
      const result = await register(email, password, name, auc_id, role)
      if (!result) {
        setErrorMessage('Registration failed. Please try again.')
        return;
      }
      navigate('/login');
    } catch (error) {
      setErrorMessage(error.message || 'Registration failed. Please try again.')
      return;
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
          <h3>Create your account</h3>
          <p>Join for secure academic assessments and evaluation</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-icon-wrap name-input-wrap">
              <input
                type="text"
                placeholder="Your Full Name"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">University Email</label>
            <div className="input-icon-wrap email-input-wrap">
              <input
                type="email"
                placeholder="person@university.edu"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <div className="input-icon-wrap role-input-wrap">
              <select
                name="role"
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="INSTRUCTOR">Instructor</option>
                <option value="STUDENT">Student</option>
                <option value="TA">TA</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-icon-wrap password-input-wrap password-input-wrap--toggle">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="..................."
                id="password"
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
                placeholder="..................."
                id="cPassword"
                value={cPassword}
                onChange={(e) => setCPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={
                  showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
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
                placeholder="123456789"
                id="id"
                value={auc_id}
                onChange={(e) => setID(e.target.value)}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="error-message">{errorMessage}</div>
          )}

          <div className="auth-buttons">
            <button type="button" className="google-signin-btn">
              <FontAwesomeIcon icon={faGoogle} />
              <span>Sign up with Google</span>
            </button>
            <button type="submit">Register</button>
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

export default RegisterView
