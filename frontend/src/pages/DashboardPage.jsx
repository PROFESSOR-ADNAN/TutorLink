import { Link } from 'react-router-dom';
import { useState } from 'react';
import { format, isAfter } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../context/authStore';
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

function BookingRow({ booking, onUpdate }) {
  const { user } = useAuthStore();
  const isTutor = user?.role === 'tutor';
  const other = isTutor ? booking.student : booking.tutor?.user;
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isPast = !isAfter(new Date(booking.scheduledAt), new Date());

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

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl transition-colors hover:bg-canvas-100 border-b border-canvas-200 last:border-0">
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

      <div className="flex items-center gap-2 flex-shrink-0">
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

        {['pending', 'confirmed'].includes(booking.status) && (
          <Button size="sm" variant="danger" onClick={() => update('cancelled')}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('upcoming');

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
      <div className="bg-white border-b border-canvas-300">
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
              <Link to="/chat" className="btn-outline btn-sm">
                Messages
              </Link>
              <Link to="/profile" className="btn-ghost btn-sm">
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
                <span className="font-serif text-xl text-forest-800">{value}</span>
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
                  tab === key ? 'border-forest-800 text-forest-800' : 'border-transparent text-ink-500'
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
                  <BookingRow key={b._id} booking={b} onUpdate={refetch} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
