import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const publicUrl = process.env.PUBLIC_URL || '';

const Landing = () => {
  const navigate = useNavigate();
  const [exitingToLogin, setExitingToLogin] = useState(false);

  const goToLogin = useCallback(() => {
    if (exitingToLogin) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      navigate('/login', { state: { fromLanding: true } });
      return;
    }

    setExitingToLogin(true);
    window.setTimeout(() => {
      navigate('/login', { state: { fromLanding: true } });
    }, 280);
  }, [exitingToLogin, navigate]);

  return (
    <div className={['landing-page', exitingToLogin && 'landing-page--exit-to-login'].filter(Boolean).join(' ')}>
      <div
        className="landing-page__bg"
        aria-hidden
        style={{ backgroundImage: `url(${publicUrl}/assets/login_campus_bg.png)` }}
      />

      <div className="landing-page__frame">
        <header className="landing-page__masthead">
          <div className="landing-page__masthead-inner">
            <div className="landing-page__identity">
              <img
                src={`${publicUrl}/assets/student_evaluation_system_logo.png`}
                alt="Student Evaluation System"
                className="landing-page__seal landing-page__system-logo"
              />
              <div className="landing-page__identity-text">
                <span className="landing-page__college-name">Student Evaluation System</span>
                <span className="landing-page__address">
                  Academic Evaluation Portal · PHINMA Education
                </span>
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="landing-page__main" tabIndex="-1">
          <section className="landing-page__hero">
            <span className="landing-page__eyebrow">Curriculum &amp; evaluation</span>
            <h1 className="landing-page__title">Academic Evaluation Portal</h1>
            <p className="landing-page__lead">
              Sign in for student or staff tools, or open the public area to run the credit-transfer simulation and
              browse the curriculum catalog—no account required.
            </p>
          </section>

          <div className="landing-page__paths">
            <article className="landing-page__path landing-page__path--account">
              <div className="landing-page__path-icon" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <div className="landing-page__path-body">
                <h2 className="landing-page__path-title">Sign in</h2>
                <p className="landing-page__path-desc">
                  Students, faculty, and administrators use their institutional account.
                </p>
                <button
                  type="button"
                  className="landing-page__btn landing-page__btn--primary"
                  onClick={goToLogin}
                  disabled={exitingToLogin}
                >
                  Go to login
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </article>

            <article className="landing-page__path landing-page__path--guest">
              <div className="landing-page__path-icon landing-page__path-icon--guest" aria-hidden>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>
              <div className="landing-page__path-body">
                <h2 className="landing-page__path-title">Explore as guest</h2>
                <p className="landing-page__path-desc">
                  Credit transfer simulation and curriculum catalog without creating an account.
                </p>
                <button
                  type="button"
                  className="landing-page__btn landing-page__btn--secondary"
                  onClick={() => navigate('/guest')}
                  disabled={exitingToLogin}
                >
                  Open guest area
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </article>
          </div>
        </main>

        <footer className="landing-page__footer">
          <p className="landing-page__footer-text">
            All rights reserved @2026
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
