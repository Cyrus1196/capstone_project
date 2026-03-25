import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import axios from 'axios';

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

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      // mark this request silent to avoid noisy console output when user is not logged in
      const response = await api.get('/user', { silent: true });
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Ensure Sanctum CSRF cookie is set on the backend origin before attempting login.
      // The `api` instance uses a baseURL that includes the `/api` prefix, so compute
      // the backend origin and call `/sanctum/csrf-cookie` directly to get the cookie.
      const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
      const backendOrigin = apiBase.replace(/\/api\/?$/, '');
      // Try to get Sanctum CSRF cookie if the endpoint exists. Some backends
      // (this project) use API routes without Sanctum, so /sanctum/csrf-cookie
      // may 404. We swallow 404s and proceed to POST /login directly.
      try {
        await axios.get(`${backendOrigin}/sanctum/csrf-cookie`, { withCredentials: true });
      } catch (err) {
        // If the endpoint does not exist (404) or other recoverable error,
        // continue without blocking login. Re-throw for network-level issues.
        if (err.response && err.response.status === 404) {
          // expected in setups without Sanctum; continue
        } else {
          // For other errors (network, CORS), rethrow to be handled by caller
          throw err;
        }
      }

      const response = await api.post('/login', { email, password });
      setUser(response.data.user);
      return { success: true, data: response.data };
    } catch (error) {
      const data = error.response?.data;
      const msg =
        (data?.errors && typeof data.errors === 'object' && Object.values(data.errors)[0]?.[0]) ||
        data?.message ||
        error.message;
      return {
        success: false,
        error: msg,
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/logout');
      setUser(null);
      return { success: true };
    } catch (error) {
      setUser(null);
      return { success: false, error: error.message };
    }
  };

  const hasPermission = (permissionName) => {
    if (!user || !permissionName) return false;
    if (user.is_admin) return true;
    const list = user.permissions;
    return Array.isArray(list) && list.includes(permissionName);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
    isDean: user?.role === 'Dean' || false,
    /** Faculty and Adviser share the faculty portal (credit review, evaluation). */
    isFaculty: user?.role === 'Faculty' || user?.role === 'Adviser' || false,
    isGuest: user?.role === 'Guest' || false,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

