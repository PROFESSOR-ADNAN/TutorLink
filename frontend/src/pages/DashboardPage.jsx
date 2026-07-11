import { Link } from 'react-router-dom';
import { useState } from 'react';
import { format, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../context/authStore';
import { useNotifications } from '../context/NotificationContext';
import useApiData from '../hooks/useApiData';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { SkeletonRows } from '../components/ui/Skeleton';

const STATUS_CONFIG = {
  pending: { label: 'Awaiting payment', variant: 'warning' },
  confirmed: { label: 'Confirmed', variant: 'forest' },
  completed: { label: 'Completed', variant: 'success' },
  cancelled: { label: 'Cancelled', variant: 'error' },
  no_show: { label: 'No-show', variant: 'neutral' },
};

/** Full session details — meeting link, discussion topic, notes, and who
 * you're meeting with. Opens for a booking of any status; fields that
 * don't apply yet (e.g. a meeting link before payment) are simply omitted
 * with an explanatory note instead of a blank gap. */
function BookingDetailsModal({ booking, onClose }) {
  const { user } = useAuthStore();
  const isTutor = user?.role === 'tutor';
  const other = isTutor ? booking.student : booking.tutor?.user;
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  const statusNote = {
    pending: 'This session isn\'t confirmed yet — the meeting link will appear here once payment is complete.',
    cancelled: booking.cancelReason
      ? `Cancelled by ${booking.cancelledBy || 'a participant'}: ${booking.cancelReason}`
      : `This session was cancelled${booking.cancelledBy ? ` by the ${booking.cancelledBy}` : ''}.`,
    no_show: 'This session was marked as a no-show.',
  }[booking.status];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface px-6 py-4 border-b border-canvas-200 flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink-900">Session details</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 p-1" aria-label="Close">✕</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar src={other?.avatar} name={other?.name} size="md" />
              <div>
                <div className="font-sans font-semibold text-sm text-ink-900">{other?.name}</div>
                <div className="text-xs text-ink-400">{isTutor ? 'Student' : 'Tutor'}{other?.email ? ` · ${other.email}` : ''}</div>
              </div>
            </div>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
          </div>

          {statusNote && (
            <div className="bg-canvas-100 border border-canvas-300 rounded-xl p-3 text-sm text-ink-600">
              {statusNote}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Subject</p>
              <p className="text-sm text-ink-900">{booking.subject}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Date & time</p>
              <p className="text-sm text-ink-900">{format(new Date(booking.scheduledAt), 'MMM d, yyyy · h:mm a')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Duration</p>
              <p className="text-sm text-ink-900">{booking.duration} minutes</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Amount</p>
              <p className="text-sm text-ink-900">
                ${(booking.payment.amount / 100).toFixed(2)}
                {booking.payment.status !== 'paid' && <span className="text-ink-400"> · {booking.payment.status}</span>}
              </p>
            </div>
          </div>

          {booking.meetingUrl && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Meeting link</p>
              <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer"
                className="text-sm text-accent font-medium hover:underline break-all">
                {booking.meetingUrl}
              </a>
            </div>
          )}

          {booking.studentNotes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">
                {isTutor ? "What the student wants help with" : 'Your notes for the tutor'}
              </p>
              <p className="text-sm text-ink-700 whitespace-pre-line">{booking.studentNotes}</p>
            </div>
          )}

          {booking.tutorNotes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Tutor's notes</p>
              <p className="text-sm text-ink-700 whitespace-pre-line">{booking.tutorNotes}</p>
            </div>
          )}

          {booking.sessionSummary && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1">Session summary</p>
              <p className="text-sm text-ink-700 whitespace-pre-line">{booking.sessionSummary}</p>
            </div>
          )}

          <Link to={`/chat/${other?._id}`} state={{ otherUser: other }} onClick={onClose} className="btn-outline w-full justify-center">
            Message {other?.name?.split(' ')[0]}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Confirmation dialog shown before a student cancels a paid session —
 * cancelling isn't reversible and (per policy) doesn't auto-refund, so this
 * makes sure that's clear before it happens rather than after. */
function CancelConfirmDialog({ booking, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-surface w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h3 className="font-serif text-lg text-ink-900 mb-2">Cancel this session?</h3>
        <p className="text-sm text-ink-600 mb-1">
          You're about to cancel your {booking.subject} session on{' '}
          {format(new Date(booking.scheduledAt), 'MMM d, yyyy')} with {booking.tutor?.user?.name}.
        </p>
        <p className="text-sm text-red-600 font-medium mb-6">
          The ${(booking.payment.amount / 100).toFixed(2)} you paid will not be refunded automatically.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            Keep session
          </Button>
          <Button variant="danger" className="flex-1" onClick={onConfirm} loading={loading}>
            Yes, cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking, onUpdate, onViewDetails }) {
  const { user } = useAuthStore();
  const isTutor = user?.role === 'tutor';
  const other = isTutor ? booking.student : booking.tutor?.user;
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isPast = !isAfter(new Date(booking.scheduledAt), new Date());
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Only allow joining starting 10 minutes before the scheduled time
  const canJoin =
    booking.status === 'confirmed' &&
    booking.meetingUrl &&
    new Date() >= new Date(new Date(booking.scheduledAt).getTime() - 30 * 60 * 1000);

  const update = async (status) => {
    try {
      await api.patch(`/bookings/${booking._id}/status`, { status });
      toast.success(`Session ${status}`);
      onUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const confirmCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/bookings/${booking._id}/status`, { status: 'cancelled' });
      toast.success('Session cancelled');
      setConfirmingCancel(false);
      onUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div
        onClick={() => onViewDetails(booking)}
        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl transition-colors hover:bg-canvas-100 border-b border-canvas-200 last:border-0 cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={other?.avatar} name={other?.name} />
          <div className="min-w-0">
            <div className="font-sans font-semibold text-sm text-ink-900 truncate">{other?.name}</div>
            <div className="text-xs text-ink-400 truncate">{booking.subject}</div>
          </div>
        </div>

        <div className="text-sm text-ink-600 flex-shrink-0">
          <div className="font-medium">{format(new Date(booking.scheduledAt), 'MMM d, yyyy')}</div>
          <div className="text-xs text-ink-400">
            {format(new Date(booking.scheduledAt), 'h:mm a')} · {booking.duration}min
          </div>
        </div>

        <div className="text-sm font-semibold text-ink-900 flex-shrink-0 font-sans">
          ${(booking.payment.amount / 100).toFixed(2)}
        </div>

        <Badge variant={cfg.variant} className="flex-shrink-0">
          {cfg.label}
        </Badge>

        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isTutor && booking.status === 'pending' && booking.payment?.status === 'unpaid' && (
            <Link to={`/pay/${booking._id}`} className="btn btn-sm text-white bg-gold-400 hover:bg-gold-500">
              Pay now
            </Link>
          )}
          {isTutor && booking.status === 'pending' && (
            <span className="text-xs text-ink-400 italic px-1">Awaiting student payment</span>
          )}
          {isTutor && booking.status === 'confirmed' && !isPast && (
            <Button size="sm" variant="secondary" onClick={() => update('completed')}>
              Complete
            </Button>
          )}

          {booking.status === 'confirmed' &&
            booking.meetingUrl &&
            (canJoin ? (
              <a
                href={booking.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm text-white bg-emerald-600 hover:bg-emerald-700"
              >
                Join →
              </a>
            ) : (
              <span
                className="btn-sm text-ink-400 bg-canvas-200 rounded-lg px-3 py-1.5 cursor-not-allowed"
                title="Link opens 10 minutes before your session"
              >
                Opens soon
              </span>
            ))}

          {/* Only the student (or an admin, elsewhere) can cancel — a tutor
              shouldn't be able to back out of a paid, confirmed session with
              a single click. And even for the student, cancelling requires
              confirmation since it isn't automatically refunded. */}
          {!isTutor && ['pending', 'confirmed'].includes(booking.status) && (
            <Button size="sm" variant="danger" onClick={() => setConfirmingCancel(true)}>
              Cancel
            </Button>
          )}

          <button onClick={() => onViewDetails(booking)} className="text-ink-400 hover:text-accent p-1.5" title="View details">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {confirmingCancel && (
        <CancelConfirmDialog
          booking={booking}
          loading={cancelling}
          onConfirm={confirmCancel}
          onClose={() => setConfirmingCancel(false)}
        />
      )}
    </>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { totalUnread } = useNotifications();
  const [tab, setTab] = useState('upcoming');
  const [selectedBooking, setSelectedBooking] = useState(null);

  const { data, loading, error, refetch } = useApiData(
    () => api.get('/bookings?limit=50'),
    []
  );
  const bookings = data?.bookings || [];

  const now = new Date();
  const filtered = bookings.filter((b) => {
    const upcoming = ['pending', 'confirmed'].includes(b.status) && isAfter(new Date(b.scheduledAt), now);
    const past =
      ['completed', 'cancelled', 'no_show'].includes(b.status) || !isAfter(new Date(b.scheduledAt), now);
    if (tab === 'upcoming') return upcoming;
    if (tab === 'past') return past;
    return true;
  });

  const stats = {
    completed: bookings.filter((b) => b.status === 'completed').length,
    upcoming: bookings.filter((b) => ['pending', 'confirmed'].includes(b.status) && isAfter(new Date(b.scheduledAt), now))
      .length,
    pending: bookings.filter((b) => b.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-canvas-100">
      {/* Header */}
      <div className="bg-surface border-b border-canvas-300">
        <div className="section py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-sans font-semibold uppercase tracking-widest mb-1 text-gold-400">
                {user?.role}
              </p>
              <h1 className="font-serif text-ink-900 text-[1.75rem]">
                Good to see you, {user?.name?.split(' ')[0]}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === 'student' && (
                <Link to="/tutors" className="btn-primary btn-sm">
                  Find a tutor
                </Link>
              )}
              <Link to="/chat" className="btn-outline btn-sm relative">
                Messages
                {totalUnread > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {totalUnread > 9 ? '9+' : totalUnread}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="btn-ghost btn-sm">
                Profile
              </Link>
              <Link to="/settings" className="btn-ghost btn-sm">
                Settings
              </Link>
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { label: 'Completed sessions', value: stats.completed },
              { label: 'Upcoming', value: stats.upcoming },
              { label: 'Awaiting confirm', value: stats.pending },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-canvas-200 border border-canvas-300">
                <span className="font-serif text-xl text-accent">{value}</span>
                <span className="text-xs text-ink-500 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings table */}
      <div className="section py-8">
        <Card padding="none">
          <div className="px-6 pt-5 flex items-center gap-0 border-b border-canvas-200">
            {[
              ['upcoming', 'Upcoming'],
              ['past', 'Past'],
              ['all', 'All'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`pb-4 px-4 text-sm font-medium border-b-2 transition-all -mb-px ${
                  tab === key ? 'border-forest-800 text-accent' : 'border-transparent text-ink-500'
                }`}
              >
                {label}
                {key === 'upcoming' && stats.upcoming > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-white bg-forest-800 text-[10px]">
                    {stats.upcoming}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-2">
            {loading ? (
              <SkeletonRows count={4} />
            ) : error ? (
              <ErrorState message={error} onRetry={refetch} />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No sessions here yet"
                description={
                  tab === 'upcoming' && user?.role === 'student'
                    ? 'Find a tutor to book your first session'
                    : 'Sessions will appear here once scheduled'
                }
                action={
                  user?.role === 'student' &&
                  tab === 'upcoming' && (
                    <Link to="/tutors" className="btn-primary btn-sm">
                      Browse tutors
                    </Link>
                  )
                }
              />
            ) : (
              <div>
                {filtered.map((b) => (
                  <BookingRow key={b._id} booking={b} onUpdate={refetch} onViewDetails={setSelectedBooking} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {selectedBooking && (
        <BookingDetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
}
