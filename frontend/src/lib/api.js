import axios from 'axios';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://academia-connect-3.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to inject the token
api.interceptors.request.use(config => {
  const userString = localStorage.getItem('user');
  if (userString) {
    try {
      const user = JSON.parse(userString);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
    }
  }
  return config;
}, error => {
  return Promise.reject(error);
});
export default api;