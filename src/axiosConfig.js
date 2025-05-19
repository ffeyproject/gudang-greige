import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://192.168.2.35:8000/api/v1/', // Replace with your API base URL
  timeout: 60000, // Request timeout (optional)
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptors for requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Add token or other logic before request is sent
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptors for responses
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors (e.g., redirect on 401 or 500)
    if (error.response && (error.response.status === 401)) {
      console.error('Error occurred! Redirecting to login...');
      window.location.href = '/login'; // Redirect to login page
    } else if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      error.response = { status: 408 };
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
// baseURL: 'https://gap-api.portalgapsoft.xyz/v1/',
// http://gap-api.produksionline.xyz/