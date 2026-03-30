import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// JWT Token management
const getToken = () => localStorage.getItem('jwt_token');
const setToken = (token) => localStorage.setItem('jwt_token', token);
const removeToken = () => localStorage.removeItem('jwt_token');

// Add request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (process.env.NODE_ENV === 'development' && !config?.silent) {
      console.log('Making request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Success: count as activity (resets idle timer). Errors: JWT refresh then retry once.
api.interceptors.response.use(
  (response) => {
    window.dispatchEvent(new CustomEvent('app-activity'));
    return response;
  },
  async (error) => {
    const config = error.config;
    const status = error.response?.status;

    if (status !== 401 || config?.silent) {
      return Promise.reject(error);
    }

    if (config._jwtRetry) {
      removeToken();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const url = config.url || '';
    if (url.includes('/jwt/refresh') || url.endsWith('/login')) {
      removeToken();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    const token = getToken();
    if (!token) {
      window.location.href = '/login';
      return Promise.reject(error);
    }

    config._jwtRetry = true;

    try {
      const refreshRes = await axios.post(
        `${API_BASE_URL}/jwt/refresh`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      const newToken = refreshRes.data?.access_token;
      if (newToken) {
        setToken(newToken);
      }
      config.headers.Authorization = `Bearer ${newToken || token}`;
      return api(config);
    } catch (refreshErr) {
      removeToken();
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    }
  }
);

export const jwtAuth = {
  getToken,
  setToken,
  removeToken,
  isAuthenticated: () => !!getToken(),
};

export default api;
