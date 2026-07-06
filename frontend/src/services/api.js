import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true, // sends the HTTP-only cookie automatically
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach JWT from localStorage if present
// (fallback for environments where cookies don't work)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401s globally
api.interceptors.response.use(
  (response) => response.data, // unwrap .data so callers get clean data
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Don't redirect here — let the auth store handle it
    }
    return Promise.reject(error.response?.data || error);
  },
);

export default api;
