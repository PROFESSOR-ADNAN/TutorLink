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

  register: async (data) => {
    const { token, user } = await api.post('/auth/register', data);
    localStorage.setItem('token', token);
    set({ user, isAuthenticated: true });
    return user;
  },

  login: async (email, password) => {
    const { token, user } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', token);
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updatedUser) => {
    set({ user: { ...get().user, ...updatedUser } });
  },
}));

export default useAuthStore;
