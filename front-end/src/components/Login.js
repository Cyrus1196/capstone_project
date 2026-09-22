import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { swalError } from '../utils/swal';
import './Login.css';

const publicUrl = process.env.PUBLIC_URL || '';
const PORTAL_ACTIVE_TAB_STORAGE_KEYS = [
  'facultyPortalActiveTab',
  'deanPortalActiveTab',
  'adminPortalActiveTab',
  'adminLookupSubPanel',
  'studentPortalActiveTab',
  'portalSidebarCollapsed_program_head_activeTab',
  'portalSidebarCollapsed_secretary_activeTab',
];

function clearStoredPortalTabs() {
  try {
    PORTAL_ACTIVE_TAB_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Ignore storage errors; login routing should still work.
  }
}

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const [captchaA, setCaptchaA] = useState(0);
  const [captchaB, setCaptchaB] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaStatus, setCaptchaStatus] = useState('idle');
  const {
    login,
    user,
    loading: authLoading,
    isAdmin,
    isDean,
    isFaculty,
    isProgramHead,
    isSecretary,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const slideFromLanding = Boolean(location.state?.fromLanding);

  const refreshCaptcha = useCallback(() => {
    setCaptchaA(Math.floor(Math.random() * 90) + 10);
    setCaptchaB(Math.floor(Math.random() * 9) + 1);
    setCaptchaInput('');
    setCaptchaStatus('idle');
  }, []);

  const captchaExpected = captchaA + captchaB;

  const evaluateCaptchaDigits = useCallback((digits, a, b) => {
    const expected = a + b;
    const needLen = String(expected).length;
    if (!digits) return 'idle';
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n)) return 'idle';
    if (digits.length < needLen) return 'idle';
    return n === expected ? 'correct' : 'incorrect';
  }, []);

  const handleCaptchaChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    setCaptchaInput(digits);
    setCaptchaStatus(evaluateCaptchaDigits(digits, captchaA, captchaB));
  };

  useEffect(() => {
    refreshCaptcha();
  }, [refreshCaptcha]);

  useEffect(() => {
    if (authLoading || !user) return;

    if (isAdmin || user.role === 'Admin') {
      navigate('/admin', { replace: true });
    } else if (isDean) {
      navigate('/dean', { replace: true });
    } else if (isProgramHead) {
      navigate('/program-head', { replace: true });
    } else if (isSecretary) {
      navigate('/secretary', { replace: true });
    } else if (isFaculty) {
      navigate('/evaluator', { replace: true });
    } else {
      navigate('/student', { replace: true });
    }
  }, [authLoading, user, isAdmin, isDean, isFaculty, isProgramHead, isSecretary, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guard before setState — React state updates are async, so double-clicks can fire twice.
    if (submittingRef.current || loading) {
      return;
    }

    const expected = captchaExpected;
    const entered = parseInt(String(captchaInput).trim(), 10);
    if (!Number.isFinite(entered) || entered !== expected) {
      setCaptchaStatus('incorrect');
      await swalError('Verification failed', 'Please solve the math problem correctly.');
      return;
    }

    setCaptchaStatus('correct');
    submittingRef.current = true;
    setLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        clearStoredPortalTabs();
        const userRole = result.data?.user?.role;
        const userIsAdmin = result.data?.user?.is_admin || false;

        if (userIsAdmin || userRole === 'Admin') {
          navigate('/admin');
        } else if (userRole === 'Dean') {
          navigate('/dean');
        } else if (userRole === 'Program Head') {
          navigate('/program-head');
        } else if (userRole === 'Secretary') {
          navigate('/secretary');
        } else if (userRole === 'Evaluator' || userRole === 'Adviser') {
          navigate('/evaluator');
        } else {
          navigate('/student');
        }
      } else {
        const msg = result.error || 'Login failed. Please check your credentials.';
        await swalError('Login failed', msg);
        refreshCaptcha();
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className={['login-page', slideFromLanding && 'login-page--from-landing'].filter(Boolean).join(' ')}>
      <div
        className="login-page__bg"
        aria-hidden
        style={{ backgroundImage: `url(${publicUrl}/assets/login_campus_bg.png)` }}
      />

      <div className="login-page__frame">
        <header className="login-page__masthead">
          <div className="login-page__masthead-inner">
            <div className="login-page__identity">
              <img
                src={`${publicUrl}/assets/cit_cagayan_de_oro_college_seal.png`}
                alt="College of Information Technology — Cagayan De Oro College"
                className="login-page__seal login-page__seal--cite"
              />
              <img
                src={`${publicUrl}/assets/student_evaluation_system_logo.png`}
                alt="Student Evaluation System"
                className="login-page__seal login-page__seal--ses"
              />
              <div className="login-page__identity-text login-page__identity-text--cite">
                <span className="login-page__college-name">Cagayan De Oro College</span>
                <span className="login-page__address">
                  College of Information Technology · PHINMA Education Network
                </span>
              </div>
              <div className="login-page__identity-text login-page__identity-text--ses">
                <span className="login-page__college-name">Student Evaluation System</span>
                <span className="login-page__address">
                  Academic Evaluation Portal · PHINMA Education
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="login-page__split">
          <aside className="login-page__visual">
            <div className="login-page__logo-frame">
              <img
                src={`${publicUrl}/assets/student_evaluation_system_logo.png`}
                alt="Student Evaluation System"
                className="login-page__hero-logo"
              />
            </div>
          </aside>

          <main id="main-content" className="login-page__main" tabIndex="-1">
            <div className="login-page__card">
              <div className="login-page__card-head">
                <span className="login-page__eyebrow">Secure access</span>
                <h1 className="login-page__title">Log in to continue</h1>
                <p className="login-page__lead">
                  Students: use your Student ID Number. Staff: use your email.
                </p>
              </div>

              <form className="login-page__form" onSubmit={handleSubmit} noValidate>
                <div className="login-page__field">
                  <label htmlFor="login-page-user">
                    <span className="login-page__req" aria-hidden>
                      *
                    </span>{' '}
                    Username
                  </label>
                  <div className="login-page__input-wrap">
                    <input
                      id="login-page-user"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Student ID Number or email"
                      required
                      autoComplete="username"
                      disabled={loading}
                    />
                    <span className="login-page__input-icon" aria-hidden>
                      <i className="fa-regular fa-user" />
                    </span>
                  </div>
                </div>

                <div className="login-page__field">
                  <label htmlFor="login-page-pass">
                    <span className="login-page__req" aria-hidden>
                      *
                    </span>{' '}
                    Password
                  </label>
                  <div className="login-page__input-wrap">
                    <input
                      id="login-page-pass"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Your password"
                      required
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="login-page__eye"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      <i
                        className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}
                        aria-hidden
                      />
                    </button>
                  </div>
                </div>

                <fieldset className="login-page__captcha-field">
                  <legend className="login-page__captcha-legend">Verification</legend>
                  <div className="login-page__captcha-row">
                    <span className="login-page__cap-box">{captchaA}</span>
                    <span className="login-page__cap-op">+</span>
                    <span className="login-page__cap-box">{captchaB}</span>
                    <span className="login-page__cap-op">=</span>
                    <div className="login-page__captcha-answer">
                      <input
                        type="text"
                        inputMode="numeric"
                        className={[
                          'login-page__cap-input',
                          captchaStatus === 'correct' && 'login-page__cap-input--correct',
                          captchaStatus === 'incorrect' && 'login-page__cap-input--incorrect',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        value={captchaInput}
                        onChange={handleCaptchaChange}
                        maxLength={4}
                        disabled={loading}
                        aria-label={`What is ${captchaA} plus ${captchaB}?`}
                        aria-invalid={captchaStatus === 'incorrect'}
                        aria-describedby="login-captcha-status"
                      />
                      <button
                        type="button"
                        className="login-page__cap-refresh"
                        onClick={refreshCaptcha}
                        title="New question"
                        aria-label="Refresh verification question"
                        disabled={loading}
                      >
                        <i className="fa-solid fa-rotate-right" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <span
                    id="login-captcha-status"
                    className={`login-page__captcha-status login-page__captcha-status--${captchaStatus || 'pending'}`}
                    role="status"
                    aria-live="polite"
                  >
                    {captchaStatus === 'correct'
                      ? 'Verification answer is correct.'
                      : captchaStatus === 'incorrect'
                        ? 'Verification answer is incorrect.'
                        : `Enter the answer to ${captchaA} plus ${captchaB}.`}
                  </span>
                </fieldset>

                <button type="submit" disabled={loading} className="login-page__submit" aria-busy={loading}>
                  {loading ? (
                    <>
                      <span className="login-page__submit-spinner" aria-hidden />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <i className="fa-solid fa-arrow-right-long" aria-hidden />
                    </>
                  )}
                </button>
              </form>

              <div className="login-page__card-footer">
                <button
                  type="button"
                  className="login-page__forgot-btn"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </button>
                <Link to="/" className="login-page__home-link">
                  Back to home
                </Link>
              </div>
            </div>
          </main>
        </div>

        <footer className="login-page__footer">
          All rights reserved @2026
        </footer>
      </div>
    </div>
  );
};

export default Login;
