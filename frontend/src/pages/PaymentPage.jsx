import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { format } from 'date-fns';
import api from '../services/api';
import { stripePromise } from '../services/stripe';
import Avatar from '../components/ui/Avatar';
import CheckoutForm from '../components/CheckoutForm';
import ErrorState from '../components/ui/ErrorState';

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    return api
      .get(`/bookings/${bookingId}`)
      .then((data) => setBooking(data.booking))
      .catch((err) => setError(err.message || 'Could not load this booking'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-24 bg-canvas-300 rounded-2xl" />
        <div className="h-64 bg-canvas-300 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  // Already paid — nothing to do here, send them to their dashboard
  if (booking.payment.status === 'paid') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-ink-600 mb-4">This session is already paid and confirmed.</p>
        <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
      </div>
    );
  }

  if (booking.status === 'cancelled') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-ink-600 mb-4">This booking was cancelled and can no longer be paid.</p>
        <Link to="/tutors" className="btn-primary">Find a tutor</Link>
      </div>
    );
  }

  const sessionPassed = new Date(booking.scheduledAt) < new Date();
  const tutorUser = booking.tutor?.user;

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-serif text-2xl text-ink-900 mb-2">Complete your payment</h1>
      <p className="text-sm text-ink-400 mb-6">
        Your slot is reserved but this session won't be confirmed until payment goes through.
      </p>

      <div className="card p-5 flex items-center gap-4 mb-6">
        <Avatar src={tutorUser?.avatar} name={tutorUser?.name} size="lg" />
        <div className="min-w-0">
          <h2 className="font-sans font-semibold text-ink-900 truncate">{tutorUser?.name}</h2>
          <p className="text-sm text-ink-400">{booking.subject}</p>
          <p className="text-xs text-ink-400 mt-0.5">
            {format(new Date(booking.scheduledAt), 'EEEE, MMM d · h:mm a')} · {booking.duration}min
          </p>
        </div>
      </div>

      <div className="card p-6">
        {sessionPassed ? (
          <div className="text-center py-4">
            <p className="text-sm text-ink-600 mb-4">
              This session's scheduled time has already passed, so it can no longer be paid for.
            </p>
            <Link to={`/book/${booking.tutor._id}`} className="btn-primary">Book a new time</Link>
          </div>
        ) : stripePromise ? (
          <Elements stripe={stripePromise}>
            <CheckoutForm
              bookingId={booking._id}
              amountCents={booking.payment.amount}
              onSuccess={() => navigate('/dashboard')}
            />
          </Elements>
        ) : (
          <div className="bg-gold-50 border border-gold-200 rounded-xl p-4 text-sm text-gold-800">
            Payments aren't configured yet. Set <code>VITE_STRIPE_PUBLIC_KEY</code> to enable checkout.
          </div>
        )}
      </div>
    </div>
  );
}
