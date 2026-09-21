import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from './Icon';

/**
 * Shared application shell for every portal (Admin, Dean, Faculty, Student).
 *
 * Replaces the four near-identical header + horizontal tab bars with one
 * sidebar layout, so navigation looks and behaves the same everywhere.
 *
 * Props:
 *   portalName  - title shown under the logo, e.g. "Student Portal"
 *   nav         - [{ key, label, icon, section?, badge? }]
 *   activeKey   - key of the currently selected nav item
 *   onNavigate  - (key) => void
 *   children    - the active screen
 */

const COLLAPSE_KEY = 'cdo.sidebar.collapsed';
const MOBILE_BREAKPOINT = 900;

/** Builds initials for the avatar: "juan.dela.cruz@..." -> "JD" */
const initialsFrom = (user) => {
  const source = user?.name || user?.email || '';
  const parts = source.split('@')[0].split(/[.\-_\s]+/).filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/** "juan.dela.cruz@mail.com" -> "Juan Dela Cruz" */
const displayNameFrom = (user) => {
  if (user?.name) return user.name;

  const local = (user?.email || '').split('@')[0];
  if (!local) return 'User';

  return local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const roleLabelFrom = (user) => {
  if (user?.is_admin) return 'Administrator';
  return user?.role || 'Student';
};

const AppShell = ({ portalName, nav = [], activeKey, onNavigate, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const activeItem = nav.find((item) => item.key === activeKey);

  /* Persist the collapsed preference across sessions. */
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* storage unavailable (private mode) — the app still works */
    }
  }, [collapsed]);

  /* Escape closes whichever overlay is open. */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setMobileOpen(false);
      setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /* Click outside closes the user dropdown. */
  useEffect(() => {
    if (!menuOpen) return undefined;

    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  /* Stop the body scrolling behind the mobile drawer. */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleNavigate = useCallback(
    (key) => {
      onNavigate(key);
      if (window.innerWidth <= MOBILE_BREAKPOINT) {
        setMobileOpen(false);
      }
    },
    [onNavigate]
  );

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (window.innerWidth <= MOBILE_BREAKPOINT) {
      setMobileOpen((open) => !open);
    } else {
      setCollapsed((value) => !value);
    }
  };

  const shellClass = [
    'app-shell',
    collapsed ? 'is-collapsed' : '',
    mobileOpen ? 'is-mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const userName = displayNameFrom(user);
  const userRole = roleLabelFrom(user);

  /* Section labels are rendered when an item starts a new group. */
  let lastSection = null;

  return (
    <div className={shellClass}>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-logo">
            <img src={`${process.env.PUBLIC_URL}/phinmA.png`} alt="" />
          </span>
          <span className="sidebar-brand-text">
            <span className="sidebar-brand-name">CDO College</span>
            <span className="sidebar-brand-sub">{portalName}</span>
          </span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {nav.map((item) => {
            const showSection = item.section && item.section !== lastSection;
            lastSection = item.section || lastSection;

            return (
              <React.Fragment key={item.key}>
                {showSection && (
                  <div className="sidebar-section-label">{item.section}</div>
                )}
                <button
                  type="button"
                  className={`nav-item${item.key === activeKey ? ' active' : ''}`}
                  data-label={item.label}
                  onClick={() => handleNavigate(item.key)}
                  aria-current={item.key === activeKey ? 'page' : undefined}
                >
                  <span className="nav-item-icon">
                    <Icon name={item.icon} size={19} />
                  </span>
                  <span className="nav-item-label">{item.label}</span>
                  {item.badge ? (
                    <span className="nav-item-badge">{item.badge}</span>
                  ) : null}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span className="avatar">{initialsFrom(user)}</span>
            <span className="sidebar-user-text">
              <span className="sidebar-user-name">{userName}</span>
              <span className="sidebar-user-role">{userRole}</span>
            </span>
          </div>
          <button type="button" className="sidebar-logout" onClick={handleLogout}>
            <Icon name="logout" size={16} />
            <span className="nav-item-label">Sign out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="topbar-toggle"
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <Icon name="menu" size={20} />
          </button>

          <div className="topbar-heading">
            <h1 className="topbar-title">{activeItem?.label || portalName}</h1>
            <span className="topbar-breadcrumb">
              {portalName}
              {activeItem ? ` / ${activeItem.label}` : ''}
            </span>
          </div>

          <div className="topbar-actions">
            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="topbar-user"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="avatar avatar-sm">{initialsFrom(user)}</span>
                <span className="topbar-user-text">
                  <span className="topbar-user-name">{userName}</span>
                  <span className="topbar-user-role">{userRole}</span>
                </span>
                <Icon name="chevronDown" size={16} />
              </button>

              {menuOpen && (
                <div className="user-menu-dropdown" role="menu">
                  <div className="user-menu-head">
                    <span className="avatar">{initialsFrom(user)}</span>
                    <span className="sidebar-user-text">
                      <span className="user-menu-email">{user?.email}</span>
                      <span className="topbar-user-role">{userRole}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="user-menu-item is-danger"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <Icon name="logout" size={18} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-content">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
