import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";
import {
  faBuildingColumns,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../components/auth/AuthWrapper";
import { useNavigate, useSearchParams } from "react-router-dom";

function LoginView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, googleLogin } = useAuth();

  useEffect(() => {
    const googleErr = searchParams.get("error");
    if (googleErr === "google_auth_failed") {
      setErrorMessage("Google sign-in failed. Please try again.");
    }
  }, [searchParams]);

  const validateEmail = (email) => {
    return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Email and password are required.");
      return;
    } else if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    } else if (password.length < 6) {
      setErrorMessage("Password should be at least 6 characters long.");
      return;
    } else {
      setErrorMessage("");
    }
    try {
      const result = await login(email, password);
      if (result.needVerification) {
        navigate('/verify-email', { state: { email } });
        return;
      } else if (!result) {
        setErrorMessage("Login failed. Please try again.");
        return;
      }
      navigate("/courses");
    } catch (error) {
      setErrorMessage(error.message || "Login failed. Please try again.");
      return;
    }
  };

  return (
    <>
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <FontAwesomeIcon
              icon={faBuildingColumns}
              className="login-logo-icon"
            />
          </div>
          <h1>Assessly</h1>
          <p>Academic Assessment Platform</p>
        </div>
        <div className="login-form">
          <div className="login-form-text">
            <h3>Welcome back</h3>
            <p>Please enter your university credentials</p>
          </div>
          <div className="login-form-body">
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-icon-wrap email-input-wrap">
                  <input
                    type="email"
                    id="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-icon-wrap password-input-wrap password-input-wrap--toggle">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="................"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
              <label htmlFor="remember" className="remember-row">
                <input
                  type="checkbox"
                  id="remember"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me</span>
              </label>
              {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
              <div className="auth-buttons">
                <button
                  type="button"
                  className="google-signin-btn"
                  onClick={googleLogin}
                >
                  <FontAwesomeIcon icon={faGoogle} />
                  <span>Sign in with Google</span>
                </button>
                <button type="submit">Login</button>
              </div>
            </form>
            <p className="signup-text">
              Don't have an account? <a href="/register">SignUp</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginView;
