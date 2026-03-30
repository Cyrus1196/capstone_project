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
    <div className="login-sis">
      <aside className="login-sis__left">
        <div className="login-sis__left-inner">
          <img
            src={`${publicUrl}/branding/cagayan_de_oro_college_seal.png`}
            alt="Cagayan de Oro College seal"
            className="login-sis__seal"
          />
          <h2 className="login-sis__college-name">Cagayan De Oro College</h2>
          <p className="login-sis__address">
            Max Suniel St. Carmen, Cagayan de Oro City, Misamis Oriental, Philippines 9000
          </p>
        </div>
      </aside>

      <main className="login-sis__right">
        <div className="login-sis__right-col">
          <div className="login-sis__phinma">
            <img
              src={`${publicUrl}/branding/PHINMA-Ed-Logo.png`}
              alt="PHINMA Education — Making lives better through education"
              className="login-sis__phinma-img"
            />
          </div>

          <div className="login-sis__card">
            <h1 className="login-sis__card-title">Sign In</h1>
            <div className="login-sis__card-rule" aria-hidden />

            <form className="login-sis__form" onSubmit={handleSubmit} noValidate>
              <div className="login-sis__field">
                <label htmlFor="login-sis-user">
                  <span className="login-sis__req" aria-hidden>
                    *
                  </span>{' '}
                  Username
                </label>
                <div className="login-sis__input-wrap">
                  <input
                    id="login-sis-user"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Username"
                    required
                    autoComplete="username"
                  />
                  <span className="login-sis__input-icon" aria-hidden>
                    <i className="fa-regular fa-user" />
                  </span>
                </div>
              </div>

              <div className="login-sis__field">
                <label htmlFor="login-sis-pass">
                  <span className="login-sis__req" aria-hidden>
                    *
                  </span>{' '}
                  Password
                </label>
                <div className="login-sis__input-wrap">
                  <input
                    id="login-sis-pass"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="login-sis__eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} aria-hidden />
                  </button>
                </div>
              </div>

              <div className="login-sis__captcha">
                <div className="login-sis__captcha-row">
                  <span className="login-sis__cap-box">{captchaA}</span>
                  <span className="login-sis__cap-op">+</span>
                  <span className="login-sis__cap-box">{captchaB}</span>
                  <span className="login-sis__cap-op">=</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={[
                      'login-sis__cap-input',
                      captchaStatus === 'correct' && 'login-sis__cap-input--correct',
                      captchaStatus === 'incorrect' && 'login-sis__cap-input--incorrect',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    value={captchaInput}
                    onChange={handleCaptchaChange}
                    placeholder=""
                    maxLength={4}
                    aria-label="Enter the sum"
                    aria-invalid={captchaStatus === 'incorrect'}
                  />
                  <button
                    type="button"
                    className="login-sis__cap-refresh"
                    onClick={refreshCaptcha}
                    title="New question"
                    aria-label="Refresh verification question"
                  >
                    <i className="fa-solid fa-rotate-right" aria-hidden />
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-sis__submit">
                <span>{loading ? 'Signing in…' : 'Sign In'}</span>
                <i className="fa-solid fa-right-to-bracket" aria-hidden />
              </button>
            </form>

            <p className="login-sis__forgot">
              <button
                type="button"
                className="login-sis__forgot-btn"
                onClick={() =>
                  swalInfo(
                    'Forgot password',
                    'Please contact your system administrator or the registrar office to reset your account.'
                  )
                }
              >
                Forgot Password
              </button>
            </p>
            <p className="login-sis__home">
              <Link to="/">← Back to home</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
