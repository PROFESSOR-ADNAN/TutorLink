import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../context/authStore';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => setMenuOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  const navLink = ({ isActive }) =>
    `relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${
      isActive
        ? 'text-forest-800'
        : 'text-ink-500 hover:text-ink-900'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-canvas-300 shadow-xs'
          : 'bg-canvas-100 border-b border-canvas-200'
      }`}
    >
      <nav className="section h-16 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <div
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105"
            style={{ background: '#1B4332' }}
          >
            {/* Subtle book/link icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3h4a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" fill="white" fillOpacity="0.9"/>
              <path d="M9 5h4a1 1 0 011 1v7a1 1 0 01-1 1H9" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-serif text-lg text-ink-900 leading-none tracking-tight">TutorLink</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-0.5">
          <NavLink to="/tutors" className={navLink}>Find Tutors</NavLink>
          {isAuthenticated && (
            <>
              <NavLink to="/dashboard" className={navLink}>Dashboard</NavLink>
              <NavLink to="/chat" className={navLink}>Messages</NavLink>
            </>
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link to="/profile" className="flex items-center gap-2.5 group">
                <div className="relative">
                  <img
                    src={user?.avatar}
                    alt={user?.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-canvas-300 group-hover:ring-forest-300 transition-all"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-white" />
                </div>
                <span className="text-sm font-medium text-ink-700 group-hover:text-ink-900 transition-colors">
                  {user?.name?.split(' ')[0]}
                </span>
              </Link>
              <button onClick={handleLogout} className="btn-ghost btn-sm">Sign out</button>
            </div>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn-primary btn-sm">Get started</Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 -mr-1 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-canvas-200 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            {menuOpen ? (
              <path fillRule="evenodd" clipRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            ) : (
              <path fillRule="evenodd" clipRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-canvas-300 bg-white">
          <div className="section py-3 space-y-0.5">
            <Link to="/tutors" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">
              Find Tutors
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">Dashboard</Link>
                <Link to="/chat" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">Messages</Link>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">Profile</Link>
                <div className="pt-2 mt-2 border-t border-canvas-200">
                  <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-2 mt-1 border-t border-canvas-200 flex flex-col gap-2">
                <Link to="/login" className="btn-outline w-full justify-center">Log in</Link>
                <Link to="/register" className="btn-primary w-full justify-center">Get started</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
