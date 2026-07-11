import { useTheme } from '../../context/ThemeContext';

/**
 * A small light/dark toggle for the Navbar. Deliberately available to
 * logged-out visitors too — theme is a device preference, not an account
 * setting, so it shouldn't be gated behind login. SettingsPage still offers
 * the fuller "System / Light / Dark" picker for signed-in users; this is
 * just a fast two-way flip between the two.
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, setMode } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      className={`p-2 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-canvas-200 transition-colors ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 3v1.5m0 15V21m9-9h-1.5m-15 0H3m15.36-6.36l-1.06 1.06M6.7 17.3l-1.06 1.06m12.72 0l-1.06-1.06M6.7 6.7L5.64 5.64M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
