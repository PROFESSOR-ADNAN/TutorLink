import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'tutorlink-theme';

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolveIsDark = (mode) => (mode === 'system' ? systemPrefersDark() : mode === 'dark');

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');

  const applyTheme = useCallback((m) => {
    document.documentElement.classList.toggle('dark', resolveIsDark(m));
  }, []);

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, applyTheme]);

  // If the person is following "System" and their OS theme changes while
  // the app is open, follow along live rather than requiring a reload.
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode, applyTheme]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark: resolveIsDark(mode) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
