import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const publicUrl = process.env.PUBLIC_URL || '';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <div className="landing-page__bg" aria-hidden />

      <div className="landing-page__frame">
        <header className="landing-page__masthead">
          <div className="landing-page__masthead-inner">
            <div className="landing-page__identity">
              <img
                src={`${publicUrl}/branding/cagayan_de_oro_college_seal.png`}
                alt="Cagayan de Oro College seal"
                className="landing-page__seal"
              />
              <div className="landing-page__identity-text">
                <span className="landing-page__college-name">Cagayan De Oro College</span>
                <span className="landing-page__address">
                  PHINMA Education · Cagayan de Oro City, Philippines
                </span>
              </div>
            </div>
            <div className="landing-page__partner">
              <img
                src={`${publicUrl}/branding/PHINMA-Ed-Logo.png`}
                alt="PHINMA Education"
                className="landing-page__phinma-img"
              />
            </div>
          </div>
        </header>

        <main className="landing-page__main">
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
                  onClick={() => navigate('/login')}
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
            Max Suniel St. Carmen, Cagayan de Oro City, Misamis Oriental 9000
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
