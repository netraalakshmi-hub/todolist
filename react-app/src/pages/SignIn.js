import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGoogle, FaEnvelope, FaLock, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/client';
import '../styles/Auth.css';

const googleClientId =
  (process.env.REACT_APP_GOOGLE_CLIENT_ID || '').trim() ||
  '967147645448-bhbi84soem6fu4r0uatrr9ugk4qndf89.apps.googleusercontent.com';

function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        });

        const profile = await profileResponse.json();

        localStorage.setItem(
          'tf_auth',
          JSON.stringify({
            provider: 'google',
            email: profile?.email,
            name: profile?.name || 'Google User',
            picture: profile?.picture,
            ts: Date.now(),
          })
        );

        navigate('/dashboard');
      } catch (err) {
        setError('Google sign-in failed. Please try again.');
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled or failed.');
    },
  });

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data || {};

      if (token) {
        localStorage.setItem('tf_token', token);
      }

      localStorage.setItem(
        'tf_auth',
        JSON.stringify({
          provider: 'email',
          email: user?.email || email,
          name: user?.name,
          ts: Date.now(),
        })
      );

      navigate('/dashboard');
    } catch (err) {
      const message = err?.response?.data?.error || 'Sign in failed. Please try again.';
      setError(message);
    }
  };

  const handleGoogleSignIn = () => {
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
          <h1>Welcome Back</h1>
          <p>Sign in to your TaskFlow account</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSignIn} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <FaEnvelope className="input-icon" />
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
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
                type={showPassword ? 'text' : 'password'}
                className="password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit">
            Sign In
          </button>
        </form>

        <div className="divider">OR</div>

        <button className="btn-google" onClick={handleGoogleSignIn}>
          <FaGoogle /> Sign in with Google
        </button>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default SignIn;
