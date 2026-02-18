import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGoogle, FaUser, FaEnvelope, FaLock, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/client';
import '../styles/Auth.css';

const googleClientId =
  (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim() ||
  '967147645448-bhbi84soem6fu4r0uatrr9ugk4qndf89.apps.googleusercontent.com';

function SignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await api.post('/auth/google', {
          accessToken: tokenResponse?.access_token,
        });

        const { token, user } = response.data || {};

        if (token) {
          localStorage.setItem('tf_token', token);
        }

        localStorage.setItem(
          'tf_auth',
          JSON.stringify({
            provider: 'google',
            email: user?.email,
            name: user?.name || 'Google User',
            ts: Date.now(),
          })
        );

        navigate('/dashboard');
      } catch (err) {
        const message = err?.response?.data?.error || 'Google sign-up failed. Please try again.';
        setError(message);
      }
    },
    onError: () => {
      setError('Google sign-up was cancelled or failed.');
    },
  });

  const handleSignUp = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setError('');

    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { token, user } = response.data || {};

      if (token) {
        localStorage.setItem('tf_token', token);
      }

      localStorage.setItem(
        'tf_auth',
        JSON.stringify({
          provider: 'email',
          email: user?.email || email,
          name: user?.name || name,
          ts: Date.now(),
        })
      );

      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.error || 'Sign up failed. Please try again.';
      setError(message);
    }
  };

  const handleGoogleSignUp = () => {
    setError('');

    if (!googleClientId) {
      setError('Google Client ID is missing. Add REACT_APP_GOOGLE_CLIENT_ID in .env');
      return;
    }

    googleLogin();
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <button className="back-btn" onClick={() => navigate('/')}>
          <FaArrowLeft /> Back
        </button>

        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join TaskFlow and boost your productivity</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSignUp} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <div className="input-wrapper">
              <FaUser className="input-icon" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <FaEnvelope className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <FaLock className="input-icon" />
              <input
                id="password"
                type={showPasswords ? 'text' : 'password'}
                className="password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPasswords((prev) => !prev)}
                aria-label={showPasswords ? 'Hide password' : 'Show password'}
                title={showPasswords ? 'Hide password' : 'Show password'}
              >
                {showPasswords ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className="input-wrapper">
              <FaLock className="input-icon" />
              <input
                id="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                className="password-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPasswords((prev) => !prev)}
                aria-label={showPasswords ? 'Hide password' : 'Show password'}
                title={showPasswords ? 'Hide password' : 'Show password'}
              >
                {showPasswords ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit">
            Create Account
          </button>
        </form>

        <div className="divider">OR</div>

        <button className="btn-google" onClick={handleGoogleSignUp}>
          <FaGoogle /> Sign up with Google
        </button>

        <p className="auth-footer">
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
