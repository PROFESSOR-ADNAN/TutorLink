import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { format, addDays } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';
import { stripePromise } from '../services/stripe';
import Avatar from '../components/ui/Avatar';
import CheckoutForm from '../components/CheckoutForm';

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Day-of-week for a plain YYYY-MM-DD string, evaluated at local midnight so
// it always matches the calendar date the person actually picked.
const dayNameFor = (dateStr) => DAY_NAMES[new Date(`${dateStr}T00:00:00`).getDay()];

// Which of the fixed TIME_SLOTS actually fit inside one of the tutor's
// availability windows for the given date, given the chosen session length.
const getAvailableSlots = (dateStr, duration, availability) => {
  if (!dateStr || !availability?.length) return [];
  const daySlots = availability.filter((a) => a.day === dayNameFor(dateStr));
  if (!daySlots.length) return [];
  return TIME_SLOTS.filter((t) => {
    const start = timeToMinutes(t);
    const end = start + duration;
    return daySlots.some((slot) => start >= timeToMinutes(slot.startTime) && end <= timeToMinutes(slot.endTime));
  });
};

// Earliest upcoming date (within 2 weeks) that falls on a day the tutor is
// actually available — used as a sane default instead of "tomorrow" blind.
const findNextAvailableDate = (availability) => {
  if (!availability?.length) return null;
  const availableDays = new Set(availability.map((a) => a.day));
  for (let i = 1; i <= 14; i++) {
    const d = addDays(new Date(), i);
    if (availableDays.has(DAY_NAMES[d.getDay()])) return d;
  }
  return null;
};

export default function BookingPage() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1 = pick slot, 2 = pay
  const [bookingId, setBookingId] = useState(null);
  const [bookingAmount, setBookingAmount] = useState(null);

  const [form, setForm] = useState({
    subject: '',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '',
    duration: 60,
    studentNotes: '',
  });

  useEffect(() => {
    api.get(`/tutors/${tutorId}`)
      .then((d) => {
        setTutor(d.tutor);
        setForm((f) => {
          const next = { ...f };
          if (d.tutor.subjects?.[0]) next.subject = d.tutor.subjects[0];
          const nextAvailableDate = findNextAvailableDate(d.tutor.availability);
          if (nextAvailableDate) next.date = format(nextAvailableDate, 'yyyy-MM-dd');
          const slots = getAvailableSlots(next.date, next.duration, d.tutor.availability);
          next.time = slots[0] || '';
          return next;
        });
      })
      .catch(() => toast.error('Could not load this tutor'))
      .finally(() => setLoading(false));
  }, [tutorId]);

  // Recompute which time slots are actually valid whenever the date or
  // session length changes, and clear a now-invalid selection.
  const availableSlots = tutor ? getAvailableSlots(form.date, form.duration, tutor.availability) : [];
  useEffect(() => {
    if (form.time && !availableSlots.includes(form.time)) {
      setForm((f) => ({ ...f, time: availableSlots[0] || '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.date, form.duration, tutor]);

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!form.time) return toast.error('Please pick an available time slot');
    try {
      // Built as an explicit UTC instant (not the browser's local timezone)
      // so the day-of-week/time the student sees here is exactly what the
      // backend checks against the tutor's availability — see
      // backend/src/controllers/booking.controller.js.
      const scheduledAt = new Date(`${form.date}T${form.time}:00.000Z`);
      const data = await api.post('/bookings', {
        tutorId,
        subject: form.subject,
        scheduledAt: scheduledAt.toISOString(),
        duration: form.duration,
        studentNotes: form.studentNotes,
      });
      setBookingId(data.booking._id);
      setBookingAmount(data.booking.payment.amount);
      setStep(2);
      toast.success('Session slot reserved! Complete payment to confirm.');
    } catch (err) {
      toast.error(err.message || 'Failed to create booking');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-32 bg-canvas-300 rounded-2xl" />
        <div className="h-64 bg-canvas-300 rounded-2xl" />
      </div>
    );
  }

  if (!tutor) return <div className="text-center py-20 text-ink-400">Tutor not found.</div>;

  const price = (tutor.hourlyRate * form.duration) / 60;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-display font-extrabold text-ink-900 mb-2">Book a Session</h1>

      {/* Tutor summary */}
      <div className="card p-5 flex items-center gap-4 mb-6">
        <Avatar src={tutor.user?.avatar} name={tutor.user?.name} size="lg" />
        <div>
          <h2 className="font-semibold text-ink-900">{tutor.user?.name}</h2>
          <p className="text-sm text-ink-400">{tutor.subjects.slice(0, 3).join(' · ')}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xl font-bold text-ink-900">${tutor.hourlyRate}<span className="text-sm font-normal text-ink-400">/hr</span></div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[{ n: 1, label: 'Choose Time' }, { n: 2, label: 'Pay' }].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-forest-800 text-white' : 'bg-canvas-300 text-ink-400'}`}>
              {n}
            </div>
            <span className={`text-sm font-medium ${step >= n ? 'text-ink-900' : 'text-ink-400'}`}>{label}</span>
            {n < 2 && <div className="w-8 h-px bg-canvas-300 ml-1" />}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {step === 1 ? (
          <form onSubmit={handleBooking} className="space-y-5">
            {/* Subject */}
            <div>
              <label className="label">Subject</label>
              <select className="input" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} required>
                {tutor.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="label">Session Length</label>
              <div className="grid grid-cols-4 gap-2">
                {DURATIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm({ ...form, duration: value })}
                    className={`py-2.5 rounded-xl text-sm font-medium border transition ${
                      form.duration === value
                        ? 'bg-forest-800 text-white border-forest-800'
                        : 'bg-surface text-ink-600 border-canvas-300 hover:border-forest-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              {tutor.availability?.length > 0 && (
                <p className="text-xs text-ink-400 mt-1.5">
                  Available: {[...new Set(tutor.availability.map((a) => a.day))].join(', ')}
                </p>
              )}
            </div>

            {/* Time */}
            <div>
              <label className="label">Time</label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {availableSlots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, time: t })}
                      className={`py-2 rounded-xl text-sm font-medium border transition ${
                        form.time === t
                          ? 'bg-forest-800 text-white border-forest-800'
                          : 'bg-surface text-ink-600 border-canvas-300 hover:border-forest-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-gold-50 border border-gold-200 rounded-xl p-3 text-sm text-gold-800">
                  {tutor.availability?.length > 0
                    ? `${tutor.user?.name} isn't available on ${dayNameFor(form.date)}s for a ${form.duration}-min session. Try a different date or a shorter session.`
                    : `${tutor.user?.name} hasn't set their weekly availability yet.`}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes for the tutor <span className="text-ink-400">(optional)</span></label>
              <textarea rows={3} className="input resize-none"
                placeholder="What do you need help with? Any specific topics or goals?"
                value={form.studentNotes}
                onChange={(e) => setForm({ ...form, studentNotes: e.target.value })}
              />
            </div>

            {/* Price summary */}
            <div className="bg-forest-50 rounded-xl p-4 flex items-center justify-between">
              <div className="text-sm text-accent">
                {form.duration} min · {form.date}{form.time ? ` at ${form.time}` : ' · pick a time above'}
              </div>
              <div className="text-xl font-display font-bold text-accent">${price.toFixed(2)}</div>
            </div>

            <button type="submit" disabled={!form.time} className="btn-primary w-full py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed">
              Continue to Payment
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
              ✅ Slot reserved for <strong>{form.date} at {form.time}</strong> — complete payment to confirm.
            </div>
            {stripePromise ? (
              <Elements stripe={stripePromise}>
                <CheckoutForm
                  bookingId={bookingId}
                  amountCents={bookingAmount}
                  onSuccess={() => navigate('/dashboard')}
                />
              </Elements>
            ) : (
              <div className="bg-gold-50 border border-gold-200 rounded-xl p-4 text-sm text-gold-800">
                Payments aren't configured yet. Set <code>VITE_STRIPE_PUBLIC_KEY</code> to enable checkout.
              </div>
            )}
            <p className="text-xs text-ink-400 text-center">
              Your slot is held for 30 minutes — pay before then or finish anytime from your dashboard.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1 text-sm">
                ← Change time slot
              </button>
              <button
                onClick={() => {
                  toast.success("Slot held — you'll find it waiting in your dashboard when you're ready to pay.");
                  navigate('/dashboard');
                }}
                className="btn-outline flex-1 text-sm"
              >
                Pay later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
