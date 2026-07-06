import axios from "axios";

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

// Response interceptor: handle 401s globally
api.interceptors.response.use(
  (response) => response.data, // unwrap .data so callers get clean data
  (error) => {
    // Don't redirect here — let the auth store / PrivateRoute handle it,
    // since only they know whether a redirect is appropriate for this call.
    return Promise.reject(error.response?.data || error);
  },
);

export default api;
