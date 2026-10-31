import { Link } from 'react-router-dom';

const STEPS = [
  { icon: '🔍', title: 'Find your tutor', text: 'Search by subject, name, or price and browse verified tutor profiles.' },
  { icon: '📅', title: 'Book a session', text: 'Pick a time that works for you from your tutor\'s real availability.' },
  { icon: '💳', title: 'Pay securely', text: 'Pay through TutorLink via Chapa — your payment is protected until your session happens.' },
  { icon: '🎓', title: 'Learn live', text: 'Join your session at the scheduled time and get one-on-one help.' },
  { icon: '⭐', title: 'Leave a review', text: 'Rate your tutor afterward to help other students choose well.' },
];

export default function StudentGuidePage() {
  return (
    <div>
      <div className="relative overflow-hidden border-b border-canvas-300"
        style={{ background: 'linear-gradient(155deg, rgb(var(--brand-primary)) 0%, rgb(var(--brand-primary-hover)) 100%)' }}>
        <div className="absolute inset-0 stripes-hero pointer-events-none" />
        <div className="section py-16 relative text-center">
          <h1 className="font-serif text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            Learning made simple
          </h1>
          <p className="text-white/80 max-w-lg mx-auto mb-8">
            Every tutor on TutorLink is verified before they can teach — so you can focus on learning,
            not on wondering who you're talking to.
          </p>
          <Link to="/tutors" className="btn-gold px-8 py-3">Find a tutor now</Link>
        </div>
      </div>

      <div className="section py-16">
        <h2 className="font-serif text-2xl text-ink-900 text-center mb-10">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card surface-brand p-5 text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-xs text-ink-400 font-semibold mb-1">Step {i + 1}</div>
              <h3 className="font-sans font-semibold text-sm text-ink-900 mb-1">{s.title}</h3>
              <p className="text-xs text-ink-500">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto space-y-6 text-ink-700">
          <div>
            <h3 className="font-serif text-lg text-ink-900 mb-2">What "verified" actually means</h3>
            <p className="text-sm">
              Every tutor submits a national ID (and usually education or certification documents) that an
              admin reviews before they're allowed to appear in search or accept bookings. It's not a
              guarantee of teaching quality, but it does mean a real person's identity has been checked.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg text-ink-900 mb-2">Your payment is protected</h3>
            <p className="text-sm">
              When you pay for a session, the money is held by TutorLink and only released to your tutor
              after the session actually takes place. If a tutor needs to cancel, an admin reviews it and
              you're refunded in full.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg text-ink-900 mb-2">Cancelling your own booking</h3>
            <p className="text-sm">
              You can cancel a pending or confirmed session yourself from your dashboard. Please note:
              student-initiated cancellations are not automatically refunded, so double-check your schedule
              before booking. If you have a genuine issue, contact support before cancelling.
            </p>
          </div>

          <div className="text-xs text-ink-400 pt-4 border-t border-canvas-200">
            This page is a friendly summary — the full details are in our{' '}
            <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>, which apply
            to your use of TutorLink.
          </div>
        </div>
      </div>
    </div>
  );
}
