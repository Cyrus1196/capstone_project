import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-card">
        <h1 className="landing-title">Capstone portal</h1>
        <p className="landing-lead">
          Sign in for student or staff features, or use the public area to try the credit transfer simulation and browse
          the curriculum catalog—no account required.
        </p>
        <div className="landing-actions">
          <button type="button" className="landing-btn landing-btn-primary" onClick={() => navigate('/login')}>
            Login
          </button>
          <button type="button" className="landing-btn landing-btn-secondary" onClick={() => navigate('/guest')}>
            Guest — credit simulation &amp; catalog
          </button>
        </div>
      </div>
    </div>
  );
};

export default Landing;
