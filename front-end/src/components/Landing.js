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
                <span className="landing-page__college-name">Academic Evaluation Portal</span>
                <span className="landing-page__address">
                  Student Evaluation System · Cagayan De Oro College
                </span>
              </div>
            </div>
            <div className="landing-page__partner">
              <img
                src={`${publicUrl}/assets/cit_cagayan_de_oro_college_seal.png`}
                alt="College of Information Technology — Cagayan De Oro College"
                className="landing-page__phinma-img landing-page__cite-seal"
              />
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
                <i className="fa-solid fa-right-to-bracket" />
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
                  <i className="fa-solid fa-arrow-right-long" aria-hidden />
                </button>
              </div>
            </article>

            <article className="landing-page__path landing-page__path--guest">
              <div className="landing-page__path-icon landing-page__path-icon--guest" aria-hidden>
                <i className="fa-solid fa-compass" />
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
                  <i className="fa-solid fa-arrow-right-long" aria-hidden />
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
