import { create } from 'zustand';
import api from '../services/api';

// Zustand is a tiny, simple state manager — think of it as a global React context
// but without the boilerplate. Any component can read/write auth state from here.
const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: true, // true while checking if user is logged in on page load
  isAuthenticated: false,

  // Called once on app mount to check if user has a valid session
  checkAuth: async () => {
    try {
      const { user } = await api.get('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // The backend sets an httpOnly cookie on register/login — we never touch
  // the token ourselves. We only keep the `user` object (non-sensitive
  // profile data) in memory here.
  register: async (data) => {
    const { user, token } = await api.post('/auth/register', data);
    if (token) {
      try {
        localStorage.setItem('token', token);
      } catch (err) {}
    }
    set({ user, isAuthenticated: true });
    return user;
  },

  login: async (email, password) => {
    const { user, token } = await api.post('/auth/login', { email, password });
    if (token) {
      try {
        localStorage.setItem('token', token);
      } catch (err) {}
    }
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout'); // backend clears the cookie
    } catch (err) {
      // Continue cleanup even if server request fails
    } finally {
      try {
        localStorage.removeItem('token');
      } catch (err) {}
      set({ user: null, isAuthenticated: false });
    }
  },

  updateUser: (updatedUser) => {
    set({ user: { ...get().user, ...updatedUser } });
  },
}));

export default useAuthStore;
