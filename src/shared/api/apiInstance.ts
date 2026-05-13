import axios from 'axios';

export const apiInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || 'Ошибка при выполнении запроса';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  },
);
