  import axios from 'axios';

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Add request interceptor for debugging
  api.interceptors.request.use(
    (config) => {
      // Respect a per-request `silent` flag to avoid noisy logs for expected failures
      if (!config?.silent) {
        console.log('Making request:', config.method?.toUpperCase(), config.url);
      }
      return config;
    },
    (error) => {
      console.error('Request error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor for debugging
  api.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Only log 401s when the request isn't marked as silent
      if (error.response?.status === 401 && !error.config?.silent) {
        console.error('401 Unauthorized - User may need to log in again');
      }
      return Promise.reject(error);
    }
  );

  export default api;

