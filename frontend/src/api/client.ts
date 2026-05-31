import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Request interceptor: add JWT token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: NO automatic redirect on 401.
// Auth state is managed by Zustand + AppLayout's guard.
// Redirecting here causes race conditions after login
// (NotificationBell fires before token is fully valid).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Just pass the error through. Components handle their own errors.
    // The AppLayout component checks for token presence and redirects if missing.
    return Promise.reject(error);
  },
);

export default apiClient;
