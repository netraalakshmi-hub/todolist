import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem('tf_token');
        localStorage.removeItem('tf_auth');
      } catch {
        // ignore
      }

      if (window.location.pathname !== '/signin') {
        window.location.href = '/signin';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
