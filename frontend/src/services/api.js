import axios from "axios";
import useAuthStore from "../context/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  withCredentials: true, // sends the HTTP-only cookie automatically
  headers: { "Content-Type": "application/json" },
});


// ✅ Add interceptors to set Content-Type dynamically
api.interceptors.request.use((config) => {
  // If the data is FormData, let axios set the Content-Type automatically
  if (config.data instanceof FormData) {
    // Don't set Content-Type - axios will set it with the correct boundary
    delete config.headers['Content-Type'];
  } else {
    // For JSON requests, set Content-Type to application/json
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// Auth is carried entirely by the httpOnly cookie the backend sets on
// login/register (see backend/src/controllers/auth.controller.js). We never
// read or write the token in localStorage/sessionStorage — anything a script
// can read (including an XSS payload) it can steal, which defeats the whole
// point of httpOnly cookies. `withCredentials: true` above is what makes the
// cookie ride along on every request automatically.

// Response interceptor: handle real session invalidation globally. Without
// this, an expired or invalidated cookie meant every page (dashboard, chat,
// profile — anything behind PrivateRoute) would just fail its data fetch
// with a generic, confusing error, with no indication that the fix is simply
// to log in again.
//
// IMPORTANT: this only acts on the backend's explicit `code: "SESSION_INVALID"`
// (set in backend/src/middleware/auth.middleware.js), not on any 401 status
// alone. A 401 can legitimately come from somewhere that has nothing to do
// with this user's session — e.g. a third-party API call failing — and
// treating every 401 as "you're logged out" caused real false-positive
// logouts. Only our own auth middleware ever sets this code.
api.interceptors.response.use(
  (response) => response.data, // unwrap .data so callers get clean data
  (error) => {
    const isSessionInvalid = error.response?.data?.code === "SESSION_INVALID";

    if (isSessionInvalid && useAuthStore.getState().isAuthenticated) {
      useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false });
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?sessionExpired=1";
      }
    }

    return Promise.reject(error.response?.data || error);
  },
);

export default api;
