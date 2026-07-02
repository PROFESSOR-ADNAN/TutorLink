import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import api from '../services/api';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

// The inner form that uses Stripe hooks
function BookingForm({ tutor, bookingData, bookingId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setPaying(true);
    try {
      // 1. Get a payment intent from our backend
      const { clientSecret } = await api.post(`/payments/create-payment-intent/${bookingId}`);

      // 2. Confirm payment with Stripe using the card element
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        toast.error(result.error.message);
      } else {
        toast.success('Payment successful! Booking confirmed 🎉');
        onSuccess();
      }
    } catch (err) {
      toast.error(err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const amount = (tutor.hourlyRate * bookingData.duration) / 60;

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Card Details</h4>
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <CardElement
            options={{
              style: {
                base: { fontSize: '14px', color: '#111827', '::placeholder': { color: '#9ca3af' } },
              },
            }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Test card: 4242 4242 4242 4242 · Any future date · Any CVC
        </p>
      </div>

      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <span className="text-sm text-gray-600">Total</span>
        <span className="text-xl font-display font-bold text-gray-900">${amount.toFixed(2)}</span>
      </div>

      <button type="submit" disabled={!stripe || paying} className="btn-primary w-full py-3 text-base">
        {paying ? 'Processing…' : `Pay $${amount.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function BookingPage() {
  const { tutorId } = useParams();
  const navigate = useNavigate();
  const [tutor, setTutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1 = pick slot, 2 = pay
  const [bookingId, setBookingId] = useState(null);

  const [form, setForm] = useState({
    subject: '',
    date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    time: '10:00',
    duration: 60,
    studentNotes: '',
  });

  useEffect(() => {
    api.get(`/tutors/${tutorId}`)
      .then((d) => {
        setTutor(d.tutor);
        if (d.tutor.subjects?.[0]) setForm((f) => ({ ...f, subject: d.tutor.subjects[0] }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tutorId]);

  const handleBooking = async (e) => {
    e.preventDefault();
    try {
      const scheduledAt = new Date(`${form.date}T${form.time}:00`);
      const data = await api.post('/bookings', {
        tutorId,
        subject: form.subject,
        scheduledAt: scheduledAt.toISOString(),
        duration: form.duration,
        studentNotes: form.studentNotes,
      });
      setBookingId(data.booking._id);
      setStep(2);
      toast.success('Session slot reserved! Complete payment to confirm.');
    } catch (err) {
      toast.error(err.message || 'Failed to create booking');
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!tutor) return <div className="text-center py-20 text-gray-500">Tutor not found.</div>;

  const price = (tutor.hourlyRate * form.duration) / 60;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-display font-extrabold text-gray-900 mb-2">Book a Session</h1>

      {/* Tutor summary */}
      <div className="card p-5 flex items-center gap-4 mb-6">
        <img src={tutor.user?.avatar} alt={tutor.user?.name}
          className="w-14 h-14 rounded-xl object-cover" />
        <div>
          <h2 className="font-semibold text-gray-900">{tutor.user?.name}</h2>
          <p className="text-sm text-gray-500">{tutor.subjects.slice(0, 3).join(' · ')}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xl font-bold text-gray-900">${tutor.hourlyRate}<span className="text-sm font-normal text-gray-400">/hr</span></div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[{ n: 1, label: 'Choose Time' }, { n: 2, label: 'Pay' }].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              {n}
            </div>
            <span className={`text-sm font-medium ${step >= n ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
            {n < 2 && <div className="w-8 h-px bg-gray-200 ml-1" />}
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
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
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
            </div>

            {/* Time */}
            <div>
              <label className="label">Time</label>
              <div className="grid grid-cols-5 gap-2">
                {TIME_SLOTS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, time: t })}
                    className={`py-2 rounded-xl text-sm font-medium border transition ${
                      form.time === t
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label">Notes for the tutor <span className="text-gray-400">(optional)</span></label>
              <textarea rows={3} className="input resize-none"
                placeholder="What do you need help with? Any specific topics or goals?"
                value={form.studentNotes}
                onChange={(e) => setForm({ ...form, studentNotes: e.target.value })}
              />
            </div>

            {/* Price summary */}
            <div className="bg-primary-50 rounded-xl p-4 flex items-center justify-between">
              <div className="text-sm text-primary-700">
                {form.duration} min · {form.date} at {form.time}
              </div>
              <div className="text-xl font-display font-bold text-primary-700">${price.toFixed(2)}</div>
            </div>

            <button type="submit" className="btn-primary w-full py-3 text-base">
              Continue to Payment
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
              ✅ Slot reserved for <strong>{form.date} at {form.time}</strong> — complete payment to confirm.
            </div>
            <Elements stripe={stripePromise}>
              <BookingForm
                tutor={tutor}
                bookingData={form}
                bookingId={bookingId}
                onSuccess={() => navigate('/dashboard')}
              />
            </Elements>
            <button onClick={() => setStep(1)} className="btn-ghost w-full text-sm">
              ← Change time slot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
