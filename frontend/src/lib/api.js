import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({ baseURL: BASE_URL });

const TOKEN_KEY = "medidesk_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Attach the bearer token to every request automatically.
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Centralize "session expired" handling: on 401, drop the stale token and
// bounce to /auth so the user isn't stuck staring at broken data.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setToken(null);
      if (window.location.pathname !== "/auth") {
        window.location.assign("/auth");
      }
    }
    return Promise.reject(error);
  },
);

export function apiErrorMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}