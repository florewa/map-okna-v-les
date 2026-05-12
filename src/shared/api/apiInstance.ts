import axios from 'axios';

import { API_URL } from '../consts';

export const apiInstance = axios.create({
  baseURL: `${API_URL}/api`,
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
