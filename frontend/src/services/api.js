import axios from "axios";
import useAuthStore from "../context/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true, // sends the HTTP-only cookie automatically
  headers: { "Content-Type": "application/json" },
});

// Auth is carried entirely by the httpOnly cookie the backend sets on
// login/register (see backend/src/controllers/auth.controller.js). We never
// read or write the token in localStorage/sessionStorage — anything a script
// can read (including an XSS payload) it can steal, which defeats the whole
// point of httpOnly cookies. `withCredentials: true` above is what makes the
// cookie ride along on every request automatically.

// Requests where a 401 is an expected, normal outcome (checking whether a
// session exists at all, or logging in) — these should never trigger the
// "your session expired" redirect below.
const AUTH_CHECK_PATHS = ["/auth/me", "/auth/login", "/auth/register"];

// Response interceptor: handle 401s globally. Without this, an expired or
// invalidated cookie meant every page (dashboard, chat, profile — anything
// behind PrivateRoute) would just fail its data fetch with a generic,
// confusing error, with no indication that the fix is simply to log in again.
api.interceptors.response.use(
  (response) => response.data, // unwrap .data so callers get clean data
  (error) => {
    const isAuthCheck = AUTH_CHECK_PATHS.some((p) => error.config?.url?.includes(p));

    if (error.response?.status === 401 && !isAuthCheck && useAuthStore.getState().isAuthenticated) {
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?sessionExpired=1";
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

export default api;
