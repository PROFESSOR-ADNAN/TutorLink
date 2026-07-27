import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import Avatar from '../components/ui/Avatar';
import ChapaCheckout from '../components/ChapaCheckout';
import ErrorState from '../components/ui/ErrorState';

export default function PaymentPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
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

  // Chapa redirects the student back here with ?status=return after
  // checkout — the webhook may not have arrived yet (or, in local dev,
  // may not be reachable at all without the Chapa CLI/tunnel running), so
  // we proactively ask "did this actually succeed?" via the same verify
  // endpoint the webhook itself uses, rather than just hoping.
  useEffect(() => {
    if (searchParams.get('status') !== 'return' || !booking || booking.payment.status === 'paid') return;

    setVerifying(true);
    api
      .get(`/payments/verify/${bookingId}`)
      .then((data) => {
        if (data.status === 'paid') {
          toast.success('Payment confirmed! Booking confirmed 🎉');
          navigate('/dashboard');
        } else {
          toast.error("We didn't receive confirmation that this payment went through — you can try again below.");
        }
      })
      .catch(() => toast.error('Could not verify payment status — you can try again below.'))
      .finally(() => setVerifying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?._id, searchParams]);

  if (loading || verifying) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 animate-pulse space-y-4">
        <div className="h-24 bg-canvas-300 rounded-2xl" />
        <div className="h-64 bg-canvas-300 rounded-2xl" />
        {verifying && <p className="text-center text-sm text-ink-400">Checking your payment status…</p>}
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
        ) : (
          <ChapaCheckout bookingId={booking._id} amount={booking.payment.amount} />
        )}
      </div>
    </div>
  );
}
