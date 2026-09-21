import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from './layout/Icon';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // Redirect based on user role
      const userRole = result.data?.user?.role;
      const userIsAdmin = result.data?.user?.is_admin || false;

      if (userIsAdmin || userRole === 'Admin') {
        navigate('/admin');
      } else if (userRole === 'Dean') {
        navigate('/dean');
      } else if (userRole === 'Faculty') {
        navigate('/faculty');
      } else {
        navigate('/student');
      }
    } else {
      setError(result.error || 'Login failed. Please check your credentials.');
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      {/* Brand side — hidden on small screens, where the form is all that matters */}
      <aside className="login-aside">
        <div className="login-aside-inner">
          <div className="login-brand">
            <span className="login-brand-logo">
              <img src={`${process.env.PUBLIC_URL}/phinmA.png`} alt="Cagayan de Oro College" />
            </span>
            <div>
              <div className="login-brand-name">Cagayan de Oro College</div>
              <div className="login-brand-sub">PHINMA Education</div>
            </div>
          </div>

          <div className="login-pitch">
            <h1>Curriculum &amp; Student Evaluation System</h1>
            <p>
              One place for enrollment records, curriculum checklists, grade encoding
              and academic evaluation.
            </p>
          </div>

          <ul className="login-features">
            <li>
              <span className="login-feature-icon">
                <Icon name="book" size={18} />
              </span>
              Track your curriculum progress subject by subject
            </li>
            <li>
              <span className="login-feature-icon">
                <Icon name="clipboard" size={18} />
              </span>
              View enrollments, grades and academic standing
            </li>
            <li>
              <span className="login-feature-icon">
                <Icon name="chart" size={18} />
              </span>
              Evaluation reports for faculty and deans
            </li>
          </ul>

          <p className="login-aside-footer">
            &copy; {new Date().getFullYear()} Cagayan de Oro College &middot; Pro Deo et Humanitate
          </p>
        </div>
      </aside>

      {/* Form side */}
      <main className="login-main">
        <div className="login-card">
          <div className="login-mobile-brand">
            <span className="login-brand-logo">
              <img src={`${process.env.PUBLIC_URL}/phinmA.png`} alt="Cagayan de Oro College" />
            </span>
            <div className="login-brand-name">Cagayan de Oro College</div>
          </div>

          <h2 className="login-title">Sign in</h2>
          <p className="login-subtitle">
            Use your school account to access your portal.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="alert alert-error" role="alert">
                <Icon name="x" size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-affix">
                <span className="input-affix-icon">
                  <Icon name="mail" size={18} />
                </span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  placeholder="you@cdo.phinma.edu.ph"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-affix">
                <span className="input-affix-icon">
                  <Icon name="lock" size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="input-affix-action"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="login-button btn-block">
              {loading ? (
                <>
                  <span className="spinner spinner-sm" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="login-help">
            Forgot your password or cannot sign in? Contact the registrar&rsquo;s office.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
