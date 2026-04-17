import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { swalError, swalInfo } from '../utils/swal';
import './Login.css';

const publicUrl = process.env.PUBLIC_URL || '';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaA, setCaptchaA] = useState(0);
  const [captchaB, setCaptchaB] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaStatus, setCaptchaStatus] = useState('idle');
  const { login } = useAuth();
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const expected = captchaExpected;
    const entered = parseInt(String(captchaInput).trim(), 10);
    if (!Number.isFinite(entered) || entered !== expected) {
      setCaptchaStatus('incorrect');
      await swalError('Verification failed', 'Please solve the math problem correctly.');
      return;
    }

    setCaptchaStatus('correct');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      const userRole = result.data?.user?.role;
      const userIsAdmin = result.data?.user?.is_admin || false;

      if (userIsAdmin || userRole === 'Admin') {
        navigate('/admin');
      } else if (userRole === 'Dean') {
        navigate('/dean');
      } else if (userRole === 'Program Head' || userRole === 'Secretary') {
        navigate('/admin');
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

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" aria-hidden />
      <div className="login-page__frame">
        <header className="login-page__masthead">
          <div className="login-page__masthead-inner">
            <div className="login-page__identity">
              <img
                src={`${publicUrl}/branding/cagayan_de_oro_college_seal.png`}
                alt="Cagayan de Oro College seal"
                className="login-page__seal"
              />
              <div className="login-page__identity-text">
                <span className="login-page__college-name">Cagayan De Oro College</span>
                <span className="login-page__address">
                  Max Suniel St. Carmen, Cagayan de Oro City, Misamis Oriental, Philippines 9000
                </span>
              </div>
            </div>
            <div className="login-page__partner">
              <img
                src={`${publicUrl}/branding/PHINMA-Ed-Logo.png`}
                alt="PHINMA Education — Making lives better through education"
                className="login-page__phinma-img"
              />
              <span className="login-page__partner-tagline">Making lives better through education</span>
            </div>
          </div>
        </header>

        <main className="login-page__main">
          <div className="login-page__card">
            <div className="login-page__card-head">
              <span className="login-page__eyebrow">Secure access</span>
              <h1 className="login-page__title">Log in to continue</h1>
              <p className="login-page__lead">Use the username and password issued to your account.</p>
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
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    autoComplete="username"
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
                  />
                  <button
                    type="button"
                    className="login-page__eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} aria-hidden />
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
                      aria-label="Enter the sum"
                      aria-invalid={captchaStatus === 'incorrect'}
                    />
                    <button
                      type="button"
                      className="login-page__cap-refresh"
                      onClick={refreshCaptcha}
                      title="New question"
                      aria-label="Refresh verification question"
                    >
                      <i className="fa-solid fa-rotate-right" aria-hidden />
                    </button>
                  </div>
                </div>
              </fieldset>

              <button type="submit" disabled={loading} className="login-page__submit">
                <span>{loading ? 'Signing in…' : 'Continue'}</span>
                <i className="fa-solid fa-arrow-right-long" aria-hidden />
              </button>
            </form>

            <div className="login-page__card-footer">
              <button
                type="button"
                className="login-page__forgot-btn"
                onClick={() =>
                  swalInfo(
                    'Forgot password',
                    'Please contact your system administrator or the registrar office to reset your account.'
                  )
                }
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
    </div>
  );
};

export default Login;
