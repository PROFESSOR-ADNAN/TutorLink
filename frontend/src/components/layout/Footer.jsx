import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useAuthStore from '../../context/authStore';
import api from '../../services/api';

function StatusIndicator() {
  // 'checking' | 'ok' | 'down' — reflects a real call to the backend's
  // health endpoint rather than a hardcoded "All systems operational" claim.
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    api
      .get('/health')
      .then(() => !cancelled && setStatus('ok'))
      .catch(() => !cancelled && setStatus('down'));
    return () => { cancelled = true; };
  }, []);

  const config = {
    checking: { color: 'bg-canvas-300', text: 'Checking status…' },
    ok: { color: 'bg-green-400', text: 'All systems operational' },
    down: { color: 'bg-red-400', text: 'Some services may be unavailable' },
  }[status];

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${config.color} ${status === 'checking' ? 'animate-pulse' : ''}`} />
      <span className="text-xs" style={{ color: 'rgb(255 255 255 / 0.35)' }}>{config.text}</span>
    </div>
  );
}

export default function Footer() {
  const { isAuthenticated } = useAuthStore();

  const platformLinks = [
    { to: '/tutors', label: 'Find Tutors' },
    ...(!isAuthenticated ? [{ to: '/register', label: 'Sign Up' }] : []),
  ];

  return (
    <footer style={{ background: '#141410', borderTop: '1px solid #2D2D26' }}>
      <div className="section py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: '#1B4332' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3h4a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" fill="white" fillOpacity="0.9"/>
                  <path d="M9 5h4a1 1 0 011 1v7a1 1 0 01-1 1H9" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="font-serif text-base text-white">TutorLink</span>
            </Link>
            <p className="text-xs leading-relaxed" style={{ color: 'rgb(255 255 255 / 0.4)', maxWidth: '22ch' }}>
              Expert tutoring, on demand. Learn live with verified tutors.
            </p>
          </div>

          <div>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgb(255 255 255 / 0.35)' }}>Platform</h4>
            <ul className="space-y-2.5">
              {platformLinks.map(({ to, label }) => (
                <li key={label}>
                  <Link to={to} className="text-sm transition-colors hover:text-white"
                    style={{ color: 'rgb(255 255 255 / 0.5)' }}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgb(255 255 255 / 0.35)' }}>Subjects</h4>
            <ul className="space-y-2.5">
              {['Mathematics', 'Programming', 'Physics', 'English', 'Chemistry'].map(s => (
                <li key={s}>
                  <Link to={`/tutors?subject=${s}`} className="text-sm transition-colors hover:text-white"
                    style={{ color: 'rgb(255 255 255 / 0.5)' }}>{s}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-sans text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgb(255 255 255 / 0.35)' }}>Support</h4>
            <ul className="space-y-2.5">
              {[
                { to: '/contact', label: 'Contact' },
                { to: '/privacy', label: 'Privacy Policy' },
                { to: '/terms',   label: 'Terms of Service' },
              ].map(({ to, label }) => (
                <li key={label}>
                  <Link to={to} className="text-sm transition-colors hover:text-white"
                    style={{ color: 'rgb(255 255 255 / 0.5)' }}>{label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{ borderTop: '1px solid #2D2D26' }}>
          <p className="text-xs" style={{ color: 'rgb(255 255 255 / 0.25)' }}>
            © {new Date().getFullYear()} TutorLink. All rights reserved.
          </p>
          <StatusIndicator />
        </div>
      </div>
    </footer>
  );
}
