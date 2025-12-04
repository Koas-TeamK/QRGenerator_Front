// src/lib/api.js
import axios from "axios";

export const ACCESS_KEY = "access_token";
export const REFRESH_KEY = "refresh_token";

export const api = axios.create({
  baseURL: "",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const url = config.url || "";
  const AUTHLESS_PATHS = [
    "/api/user/login",
    "/api/admin/login",
  ];
  const isAuthPath = AUTHLESS_PATHS.some((p) => url.includes(p));

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

// --- 응답 인터셉터: 서버가 새 토큰을 헤더로 주면 교체(갈아끼우기) ---
api.interceptors.response.use(
  (res) => {
    // Axios는 헤더 키를 소문자로 normalize 함
    const auth = res?.headers?.authorization || res?.headers?.Authorization;
    if (auth && auth.startsWith("Bearer ")) {
      const nextToken = auth.slice(7);
      // 로컬/기본헤더 교체
      localStorage.setItem(ACCESS_KEY, nextToken);
      api.defaults.headers.common.Authorization = `Bearer ${nextToken}`;
      // console.debug("[api] Access token refreshed from response header");
    }
    return res;
  },
  async (err) => {
    // (옵션) 401 공통 처리
    // if (err?.response?.status === 401) {
    //   localStorage.removeItem(ACCESS_KEY);
    //   localStorage.removeItem(REFRESH_KEY);
    //   // 필요시 로그인 페이지로 보내기 등
    // }
    return Promise.reject(err);
  }
);
