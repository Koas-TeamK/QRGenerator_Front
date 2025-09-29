// src/lib/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
});

// 토큰 키 상수
export const ACCESS_KEY = 'access_token';
export const REFRESH_KEY = 'refresh_token';

// 모든 요청에 토큰 자동 첨부 (로그인/회원가입 제외)
api.interceptors.request.use((config) => {
  const url = config.url || '';
  const isAuthPath =
    url.includes('/api/user/login');

  if (!isAuthPath) {
    const t = localStorage.getItem(ACCESS_KEY);
    if (t) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${t}`;
    }
  } else if (config?.headers?.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

// 필요 시 401 처리(리프레시 토큰 없으면 주석 유지)
// api.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     if (err?.response?.status === 401) {
//       localStorage.removeItem(ACCESS_KEY);
//       localStorage.removeItem('me');
//     }
//     return Promise.reject(err);
//   }
// );
