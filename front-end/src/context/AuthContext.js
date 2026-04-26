import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import api, { jwtAuth } from '../api/axios';

const IDLE_LOGOUT_MS = parseInt(process.env.REACT_APP_IDLE_TIMEOUT_MS || '3600000', 10);

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionIdleMs, setSessionIdleMs] = useState(IDLE_LOGOUT_MS);

  const applySecurityFromResponse = useCallback((security, user) => {
    const isStudent = user?.role === 'Student';
    let minutes;
    if (isStudent) {
      const s = Number(security?.student_session_timeout_minutes);
      const fallback = Number(security?.session_timeout_minutes);
      minutes = Number.isFinite(s) && s >= 1 ? s : fallback;
    } else {
      minutes = Number(security?.session_timeout_minutes);
    }
    const m = Number(minutes);
    if (Number.isFinite(m) && m >= 1) {
      setSessionIdleMs(m * 60 * 1000);
    } else {
      setSessionIdleMs(IDLE_LOGOUT_MS);
    }
  }, []);

  const checkUser = useCallback(async () => {
    try {
      if (jwtAuth.isAuthenticated()) {
        const response = await api.get('/user');
        setUser(response.data.user);
        applySecurityFromResponse(response.data.security, response.data.user);
      } else {
        setUser(null);
        setSessionIdleMs(IDLE_LOGOUT_MS);
      }
    } catch (error) {
      setUser(null);
      setSessionIdleMs(IDLE_LOGOUT_MS);
    } finally {
      setLoading(false);
    }
  }, [applySecurityFromResponse]);

  const refreshSessionPolicy = useCallback(async () => {
    if (!jwtAuth.isAuthenticated()) {
      return;
    }
    try {
      const response = await api.get('/user', { silent: true });
      applySecurityFromResponse(response.data?.security, response.data?.user);
    } catch {
      // ignore
    }
  }, [applySecurityFromResponse]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } catch {
      // still clear client session
    } finally {
      jwtAuth.removeToken();
      setUser(null);
      setSessionIdleMs(IDLE_LOGOUT_MS);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/login', { email, password });
      
      // Store JWT token
      if (response.data.access_token) {
        jwtAuth.setToken(response.data.access_token);
      }
      
      setUser(response.data.user);
      applySecurityFromResponse(response.data.security, response.data.user);
      return { success: true, data: response.data };
    } catch (error) {
      const data = error.response?.data;
      const fromErrors =
        (Array.isArray(data?.errors?.email) && data.errors.email[0]) ||
        (data?.errors && typeof data.errors === 'object' && Object.values(data.errors)[0]?.[0]);
      const msg =
        fromErrors ||
        data?.error ||
        data?.message ||
        error.message;
      return {
        success: false,
        error: msg,
      };
    }
  };

  const hasPermission = (permissionName) => {
    if (!user || !permissionName) return false;
    if (user.is_admin) return true;
    const list = user.permissions;
    return Array.isArray(list) && list.includes(permissionName);
  };

  const hasAnyPermission = (permissionNames) => {
    if (!user || !Array.isArray(permissionNames) || permissionNames.length === 0) return false;
    if (user.is_admin) return true;
    const list = user.permissions;
    if (!Array.isArray(list)) return false;
    return permissionNames.some((name) => list.includes(name));
  };

  /**
   * True if the current role has any of these permission names in the DB (JWT /user payload).
   * Does not treat Admin as all-powerful — used so Admin Panel tabs match Role Settings checkboxes.
   */
  const hasAnyAssignedPermission = useCallback((permissionNames) => {
    if (!user || !Array.isArray(permissionNames) || permissionNames.length === 0) return false;
    const list = user.permissions;
    if (!Array.isArray(list)) return false;
    return permissionNames.some((name) => list.includes(name));
  }, [user]);

  /**
   * Sidebar / module visibility: admins see everything; others need at least one matching name
   * from the JWT permission list (role defaults + user overrides from User permissions).
   */
  const canAccessModule = useCallback(
    (permissionNames) => {
      if (!user) return false;
      if (user.is_admin) return true;
      return hasAnyAssignedPermission(permissionNames);
    },
    [user, hasAnyAssignedPermission]
  );

  const value = {
    user,
    loading,
    /** Idle timeout duration (ms) from security settings; used by SessionIdleController. */
    sessionIdleMs,
    login,
    logout,
    /** Re-fetch /user (e.g. after admin updates your role permissions). */
    refreshUser: checkUser,
    refreshSessionPolicy,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    isDean: user?.role === 'Dean' || false,
    isProgramHead: user?.role === 'Program Head' || false,
    isSecretary: user?.role === 'Secretary' || false,
    /** Evaluator and Adviser share the evaluator portal (evaluation workflows). */
    isFaculty: user?.role === 'Evaluator' || user?.role === 'Adviser' || false,
    hasPermission,
    hasAnyPermission,
    hasAnyAssignedPermission,
    canAccessModule,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

