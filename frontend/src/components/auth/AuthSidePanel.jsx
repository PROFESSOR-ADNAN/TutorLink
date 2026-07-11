import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const TESTIMONIALS = [
  {
    quote: 'My grades went from a C to an A in just three weeks.',
    name: 'Sara Almaz',
    role: 'Mathematics student',
    initials: 'SA',
  },
  {
    quote: "I found a Python tutor in under 10 minutes. We've been working together for 3 months now.",
    name: 'Biruk Tadesse',
    role: 'Programming student, Addis Ababa',
    initials: 'BT',
  },
  {
    quote: 'Teaching on TutorLink let me turn tutoring into a real second income, on my own schedule.',
    name: 'Helen Girma',
    role: 'Physics tutor',
    initials: 'HG',
  },
];

const STATS = [
  { value: '2,000+', label: 'Verified tutors' },
  { value: '15k+', label: 'Sessions completed' },
  { value: '4.8★', label: 'Average rating' },
];

// Floating subject chips — purely decorative, gives the panel some life
// without needing an illustration asset.
const FLOATING_CHIPS = [
  { label: 'Calculus', top: '14%', left: '8%', delay: '0s' },
  { label: 'Python', top: '68%', left: '4%', delay: '0.6s' },
  { label: 'IELTS', top: '10%', left: '72%', delay: '1.1s' },
  { label: 'Chemistry', top: '55%', left: '78%', delay: '1.7s' },
];

export default function AuthSidePanel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActive((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(id);
  }, []);

  const t = TESTIMONIALS[active];

  return (
    <div
      className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
      style={{
        maxWidth: '480px',
        background: 'linear-gradient(155deg, #1B4332 0%, #163728 55%, #0c2118 100%)',
      }}
    >
      <div className="absolute inset-0 bg-grid-canvas opacity-[0.06]" />
      {/* Soft gold glow, top-right — keeps the panel from feeling flat/uniform green */}
      <div
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{ background: '#D4A017' }}
      />

      {/* Floating subject chips */}
      {FLOATING_CHIPS.map(({ label, top, left, delay }) => (
        <span
          key={label}
          className="absolute hidden xl:inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium text-white/80 backdrop-blur-sm animate-fade-in"
          style={{
            top,
            left,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            animationDelay: delay,
          }}
        >
          {label}
        </span>
      ))}

      {/* Logo */}
      <Link to="/" className="relative z-10 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/10 border border-white/15">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M3 3h4a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" fill="white" fillOpacity="0.9"/>
            <path d="M9 5h4a1 1 0 011 1v7a1 1 0 01-1 1H9" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="font-serif text-base text-white">TutorLink</span>
      </Link>

      {/* Headline */}
      <div className="relative z-10">
        <h2 className="font-serif text-white text-[2rem] leading-[1.15] mb-3 text-balance">
          Learning that actually fits your life.
        </h2>
        <p className="text-sm text-white/60 max-w-[30ch]">
          Book a real tutor, in real time — no waiting rooms, no long courses to finish first.
        </p>
      </div>

      {/* Rotating testimonial */}
      <div className="relative z-10">
        <div className="flex gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-4 h-4 text-gold-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          ))}
        </div>

        <p key={active} className="font-serif text-white text-xl leading-snug mb-5 min-h-[5.5rem] animate-fade-in">
          "{t.quote}"
        </p>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-white/10 border border-white/15">
            {t.initials}
          </div>
          <div>
            <div className="text-sm font-medium text-white">{t.name}</div>
            <div className="text-xs text-white/45">{t.role}</div>
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex gap-1.5 mb-8">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Show testimonial ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === active ? 'w-6 bg-gold-400' : 'w-1.5 bg-white/25'
              }`}
            />
          ))}
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-6 pt-6 border-t border-white/10">
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div className="font-serif text-white text-lg leading-none mb-1">{value}</div>
              <div className="text-[11px] text-white/45 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
