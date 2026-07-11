import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import useAuthStore from '../../context/authStore';
import { useNotifications } from '../../context/NotificationContext';
import Avatar from '../ui/Avatar';
import toast from 'react-hot-toast';

function NotificationBell() {
  const { unreadConversations, totalUnread, markConversationRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const openConversation = (conv) => {
    markConversationRead(conv.otherUser._id);
    setOpen(false);
    navigate(`/chat/${conv.otherUser._id}`, { state: { otherUser: conv.otherUser } });
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-canvas-200 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {totalUnread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] card p-0 overflow-hidden shadow-lg z-50">
          <div className="px-4 py-3 border-b border-canvas-200">
            <h3 className="font-sans font-semibold text-sm text-ink-900">Messages</h3>
          </div>
          {unreadConversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-400 text-center">You're all caught up.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {unreadConversations.map((conv) => (
                <button
                  key={conv._id}
                  onClick={() => openConversation(conv)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-canvas-100 transition-colors text-left border-b border-canvas-100 last:border-0"
                >
                  <Avatar src={conv.otherUser?.avatar} name={conv.otherUser?.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans font-medium text-sm text-ink-900 truncate">{conv.otherUser?.name}</span>
                      <span className="text-[11px] text-ink-400 flex-shrink-0">
                        {format(new Date(conv.lastMessage.createdAt), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500 truncate">{conv.lastMessage.content}</p>
                  </div>
                  <span className="min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-forest-800 text-white text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {conv.unreadCount}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Link to="/chat" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-center text-xs font-semibold text-accent hover:bg-canvas-100 border-t border-canvas-200">
            View all messages
          </Link>
        </div>
      )}
    </div>
  );
}

function SettingsButton() {
  return (
    <Link
      to="/settings"
      className="p-2 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-canvas-200 transition-colors"
      aria-label="Settings"
      title="Settings"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
      </svg>
    </Link>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { totalUnread } = useNotifications();
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
        ? 'text-accent'
        : 'text-ink-500 hover:text-ink-900'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-surface/95 backdrop-blur-md border-b border-canvas-300 shadow-xs'
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
              {user?.role === 'admin' && <NavLink to="/admin" className={navLink}>Admin</NavLink>}
            </>
          )}
        </div>

        {/* Desktop auth */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-1">
              <NotificationBell />
              <SettingsButton />
              <Link to="/profile" className="flex items-center gap-2.5 group pl-2">
                <div className="relative">
                  <Avatar src={user?.avatar} name={user?.name} size="sm" className="ring-2 ring-canvas-300 group-hover:ring-forest-300 transition-all" />
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
        <div className="md:hidden border-t border-canvas-300 bg-surface">
          <div className="section py-3 space-y-0.5">
            <Link to="/tutors" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">
              Find Tutors
            </Link>
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">Dashboard</Link>
                <Link to="/chat" className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">
                  Messages
                  {totalUnread > 0 && (
                    <span className="min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  )}
                </Link>
                <Link to="/profile" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">Profile</Link>
                <Link to="/settings" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">Settings</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-ink-700 hover:bg-canvas-100 hover:text-ink-900 transition-colors">Admin</Link>
                )}
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
