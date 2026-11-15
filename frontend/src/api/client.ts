import axios from 'axios';
import { auth } from '../firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: attach Firebase ID token or demo token
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } catch (err) {
        console.warn('Failed to get Firebase token:', err);
      }
    } else if (localStorage.getItem('cryptopilot_demo_auth') === 'true') {
      config.headers.Authorization = 'Bearer demo-token';
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 gracefully without force-signing out the user
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const user = auth.currentUser;
      if (user && !error.config._retry) {
        error.config._retry = true;
        try {
          const token = await user.getIdToken(true);
          error.config.headers.Authorization = `Bearer ${token}`;
          return apiClient(error.config);
        } catch (refreshErr) {
          console.warn('Token refresh error:', refreshErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
