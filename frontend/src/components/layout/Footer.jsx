import { Link } from 'react-router-dom';

export default function Footer() {
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
              {[
                { to: '/tutors',        label: 'Find Tutors' },
                { to: '/become-tutor',  label: 'Become a Tutor' },
                { to: '/register',      label: 'Sign Up' },
              ].map(({ to, label }) => (
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
                { href: 'mailto:support@tutorlink.com', label: 'Contact' },
                { href: '#', label: 'Privacy Policy' },
                { href: '#', label: 'Terms of Service' },
              ].map(({ href, label }) => (
                <li key={label}>
                  <a href={href} className="text-sm transition-colors hover:text-white"
                    style={{ color: 'rgb(255 255 255 / 0.5)' }}>{label}</a>
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
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <span className="text-xs" style={{ color: 'rgb(255 255 255 / 0.35)' }}>All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
