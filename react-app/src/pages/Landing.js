import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaArrowRight, FaGoogle } from 'react-icons/fa';
import '../styles/Landing.css';

function Landing() {
  const navigate = useNavigate();

  const handleGoogleSignIn = () => {
    // TODO: Implement Google OAuth
    navigate('/signin');
  };

  return (
    <div className="landing">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <FaCheckCircle className="nav-icon" />
            <span>TaskFlow</span>
          </div>
          <ul className="nav-menu">
            <li><a href="#features">Features</a></li>
            <li><a href="#about">About</a></li>
            <li><a href="#contact">Contact</a></li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">Stay Organized, Stay Productive</h1>
          <p className="hero-subtitle">
            Manage your tasks efficiently with TaskFlow - your personal task management companion
          </p>

          {/* Animated Icon */}
          <div className="icon-container">
            <div className="rotating-icon">
              <FaCheckCircle size={150} />
            </div>
          </div>

          {/* Call to Action Buttons */}
          <div className="cta-buttons">
            <button
              className="btn btn-primary"
              onClick={() => navigate('/signup')}
            >
              Get Started
              <FaArrowRight className="btn-icon" />
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleGoogleSignIn}
            >
              <FaGoogle className="btn-icon" />
              Sign in with Google
            </button>
          </div>
        </div>

        {/* Illustration */}
        <div className="hero-illustration">
          <div className="task-card card1">
            <div className="task-check">✓</div>
            <div className="task-text">Buy groceries</div>
          </div>
          <div className="task-card card2">
            <div className="task-check">✓</div>
            <div className="task-text">Complete project</div>
          </div>
          <div className="task-card card3">
            <div className="task-check">✓</div>
            <div className="task-text">Team meeting</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <h2>Why Choose TaskFlow?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Easy Task Management</h3>
            <p>Create, organize, and prioritize your tasks in seconds</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Lightning Fast</h3>
            <p>Instant sync across all your devices</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔔</div>
            <h3>Smart Reminders</h3>
            <p>Never miss a deadline with intelligent notifications</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Goal Tracking</h3>
            <p>Set milestones and track your progress</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 TaskFlow. Simplifying your productivity journey.</p>
      </footer>
    </div>
  );
}

export default Landing;
