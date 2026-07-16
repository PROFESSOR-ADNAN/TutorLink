import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import useApiData from '../hooks/useApiData';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { SkeletonRows } from '../components/ui/Skeleton';
import GradientHero from '../components/ui/GradientHero';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'approvals', label: 'Tutor Approvals' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'users', label: 'Users' },
  { key: 'bookings', label: 'Bookings' },
];

function StatCard({ label, value, hint }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">{label}</div>
      <div className="font-serif text-3xl text-ink-900">{value}</div>
      {hint && <div className="text-xs text-ink-400 mt-1">{hint}</div>}
    </div>
  );
}

function OverviewTab() {
  const { data, loading, error, refetch } = useApiData(() => api.get('/admin/stats'), []);
  const [health, setHealth] = useState('checking');

  useEffect(() => {
    api.get('/health').then(() => setHealth('ok')).catch(() => setHealth('down'));
  }, []);

  if (loading) return <SkeletonRows count={4} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const s = data.stats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total users" value={s.totalUsers} hint={`${s.activeUsers} active`} />
        <StatCard label="Students" value={s.totalStudents} />
        <StatCard label="Tutors" value={s.totalTutors} hint={s.pendingApprovals > 0 ? `${s.pendingApprovals} pending` : 'all approved'} />
        <StatCard label="Revenue" value={`$${(s.totalRevenue / 100).toFixed(2)}`} hint="paid bookings" />
        <StatCard label="Total bookings" value={s.totalBookings} />
        <StatCard label="Completed sessions" value={s.completedSessions} />
        <StatCard label="Cancelled" value={s.cancelledBookings} />
        <div className="card p-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-1.5">API status</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${health === 'ok' ? 'bg-green-400' : health === 'down' ? 'bg-red-400' : 'bg-canvas-400 animate-pulse'}`} />
            <span className="font-sans font-semibold text-sm text-ink-900">
              {health === 'ok' ? 'Operational' : health === 'down' ? 'Unreachable' : 'Checking…'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EarningsTab() {
  const { data, loading, error, refetch } = useApiData(() => api.get('/admin/earnings'), []);
  const [range, setRange] = useState('daily'); // 'daily' | 'monthly'

  if (loading) return <SkeletonRows count={4} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const { totals, statusBreakdown: sb, daily, monthly, byTutor, commissionRate } = data;
  const chartData = (range === 'daily' ? daily : monthly).map((d) => ({
    label: range === 'daily' ? format(new Date(d._id), 'MMM d') : format(new Date(`${d._id}-01`), 'MMM yyyy'),
    'Platform commission': +(d.platformFees / 100).toFixed(2),
    'Gross revenue': +(d.grossRevenue / 100).toFixed(2),
  }));

  const money = (cents) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Top-line totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Platform commission"
          value={money(totals.platformFees)}
          hint={`${(commissionRate * 100).toFixed(0)}% of gross revenue`}
        />
        <StatCard label="Gross revenue" value={money(totals.grossRevenue)} hint="total charged to students" />
        <StatCard label="Paid to tutors" value={money(totals.tutorPayouts)} hint="via Stripe Connect" />
        <StatCard label="Paid bookings" value={totals.paidBookings} />
      </div>

      {/* Booking status breakdown — answers "which bookings actually took
          place vs. got cancelled vs. are still upcoming", and where the
          money for each bucket currently sits. */}
      <div className="card p-5">
        <h3 className="font-sans font-semibold text-sm text-ink-900 mb-1">Where every booking stands</h3>
        <p className="text-xs text-ink-400 mb-4">Money only leaves a "cancelled & refunded" booking — everything else keeps its payout.</p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Completed', sub: 'session took place', data: sb.completed, tone: 'text-forest-700' },
            { label: 'Confirmed', sub: 'paid, upcoming', data: sb.confirmed, tone: 'text-accent' },
            { label: 'Awaiting payment', sub: 'never checked out', data: sb.pendingUnpaid, tone: 'text-ink-500' },
            { label: 'Cancelled, refunded', sub: 'money returned', data: sb.cancelledRefunded, tone: 'text-red-500' },
            { label: 'Cancelled, no refund', sub: 'was never paid', data: sb.cancelledNoRefund, tone: 'text-ink-400' },
          ].map(({ label, sub, data: d, tone }) => (
            <div key={label} className="rounded-xl border border-canvas-300 p-3">
              <div className={`font-serif text-xl ${tone}`}>{d.count}</div>
              <div className="text-xs font-medium text-ink-700 mt-0.5">{label}</div>
              <div className="text-[11px] text-ink-400">{sub}</div>
              {d.amount > 0 && <div className="text-xs text-ink-500 mt-1">{money(d.amount)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Trend chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-sans font-semibold text-sm text-ink-900">Revenue & commission over time</h3>
          <div className="flex gap-1 bg-canvas-200 rounded-lg p-1">
            {['daily', 'monthly'].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                  range === r ? 'bg-surface text-ink-900 shadow-sm' : 'text-ink-500'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <EmptyState
            title="No paid bookings yet"
            description="This chart is driven entirely by real payments — it'll fill in as soon as a session is actually paid for through Stripe. Test/seeded bookings marked 'paid' without going through checkout won't show a trend here, only in the totals above."
          />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grossFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8fbfaa" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#8fbfaa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="feeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D4A017" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#D4A017" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--canvas-300))" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgb(var(--ink-400))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'rgb(var(--ink-400))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(v) => `$${v.toFixed(2)}`}
                contentStyle={{ background: 'rgb(var(--surface))', border: '1px solid rgb(var(--canvas-300))', borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="Gross revenue" stroke="#2d6652" fill="url(#grossFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="Platform commission" stroke="#D4A017" fill="url(#feeFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-tutor breakdown — "individual gains" */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-canvas-200">
          <h3 className="font-sans font-semibold text-sm text-ink-900">Earnings by tutor</h3>
          <p className="text-xs text-ink-400 mt-0.5">What each tutor has earned, what TutorLink kept in commission, and whether they're actually set up to receive it.</p>
        </div>
        {byTutor.length === 0 ? (
          <EmptyState title="No tutor earnings yet" description="Nothing has been paid for yet — this fills in once a student completes checkout on a booking." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-ink-400 border-b border-canvas-200">
                  <th className="px-5 py-3">Tutor</th>
                  <th className="px-5 py-3">Paid sessions</th>
                  <th className="px-5 py-3">Completed</th>
                  <th className="px-5 py-3">Tutor earned</th>
                  <th className="px-5 py-3">Platform kept</th>
                  <th className="px-5 py-3">Payouts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-canvas-200">
                {byTutor.map((t) => (
                  <tr key={t.tutorId}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={t.avatar} name={t.name} size="sm" />
                        <span className="font-medium text-ink-900">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-ink-600">{t.paidSessions}</td>
                    <td className="px-5 py-3 text-ink-600">{t.completedSessions}</td>
                    <td className="px-5 py-3 font-medium text-ink-900">{money(t.totalPayout)}</td>
                    <td className="px-5 py-3 text-ink-500">{money(t.totalPlatformFee)}</td>
                    <td className="px-5 py-3">
                      <Badge variant={t.payoutsEnabled ? 'success' : 'warning'}>
                        {t.payoutsEnabled ? 'Set up' : 'Not set up'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalsTab() {
  const { data, loading, error, refetch } = useApiData(() => api.get('/admin/tutors/pending'), []);
  const [busyId, setBusyId] = useState(null);

  const act = async (id, action) => {
    setBusyId(id);
    try {
      if (action === 'approve') {
        await api.patch(`/admin/tutors/${id}/approve`);
        toast.success('Tutor approved — they are now publicly listed');
      } else {
        await api.delete(`/admin/tutors/${id}`);
        toast.success('Application rejected');
      }
      refetch();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <SkeletonRows count={3} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (data.tutors.length === 0) {
    return <EmptyState icon="✅" title="No pending applications" description="New tutor applications will show up here for review." />;
  }

  return (
    <div className="card divide-y divide-canvas-200">
      {data.tutors.map((t) => (
        <div key={t._id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar src={t.user?.avatar} name={t.user?.name} />
          <div className="flex-1 min-w-0">
            <div className="font-sans font-semibold text-sm text-ink-900">{t.user?.name}</div>
            <div className="text-xs text-ink-400">{t.user?.email}</div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {t.subjects?.map((s) => (
                <span key={s} className="badge badge-neutral">{s}</span>
              ))}
            </div>
            <div className="text-xs text-ink-500 mt-2">
              {t.educationLevel}{t.university ? ` · ${t.university}` : ''} · ${t.hourlyRate}/hr · {t.experience} yrs experience
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button size="sm" variant="danger" disabled={busyId === t._id} onClick={() => act(t._id, 'reject')}>
              Reject
            </Button>
            <Button size="sm" disabled={busyId === t._id} onClick={() => act(t._id, 'approve')}>
              Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CancellationsTab() {
  const { data, loading, error, refetch } = useApiData(() => api.get('/admin/cancellation-requests'), []);
  const [busyId, setBusyId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  const resolve = async (booking, decision) => {
    setBusyId(booking._id);
    try {
      await api.patch(`/admin/cancellation-requests/${booking._id}`, { decision, adminNote: noteDrafts[booking._id] || '' });
      toast.success(
        decision === 'approve'
          ? `Approved — session cancelled, $${(booking.payment.amount / 100).toFixed(2)} refunded to ${booking.student?.name}`
          : 'Request denied — session stays as scheduled'
      );
      refetch();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <SkeletonRows count={3} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (data.bookings.length === 0) {
    return <EmptyState icon="✅" title="No pending cancellation requests" description="When a student or tutor requests to cancel a paid session, it shows up here for review." />;
  }

  return (
    <div className="card divide-y divide-canvas-200">
      {data.bookings.map((b) => {
        const requestedByTutor = b.cancellationRequest.requestedBy === 'tutor';
        const requester = requestedByTutor ? b.tutor?.user : b.student;
        const otherParty = requestedByTutor ? b.student : b.tutor?.user;
        return (
        <div key={b._id} className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-3">
            <Avatar src={requester?.avatar} name={requester?.name} />
            <div className="flex-1 min-w-0">
              <div className="font-sans font-semibold text-sm text-ink-900">
                {requester?.name}
                <span className="text-ink-400 font-normal"> ({requestedByTutor ? 'tutor' : 'student'}) wants to cancel with </span>
                {otherParty?.name}
              </div>
              <div className="text-xs text-ink-400 mt-0.5">
                {b.subject} · {format(new Date(b.scheduledAt), 'MMM d, yyyy · h:mm a')} · ${(b.payment.amount / 100).toFixed(2)} paid
                <span className="text-accent"> — will refund the full ${(b.payment.amount / 100).toFixed(2)} to {b.student?.name} if approved</span>
              </div>
              <div className="bg-canvas-100 border border-canvas-300 rounded-lg p-3 mt-2 text-sm text-ink-700">
                "{b.cancellationRequest.reason}"
              </div>
              <div className="text-[11px] text-ink-400 mt-1">
                Requested {format(new Date(b.cancellationRequest.requestedAt), 'MMM d, h:mm a')}
              </div>
            </div>
          </div>
          <input
            className="input text-sm mb-3"
            placeholder="Optional note (visible to your admin team only)"
            value={noteDrafts[b._id] || ''}
            onChange={(e) => setNoteDrafts({ ...noteDrafts, [b._id]: e.target.value })}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger" disabled={busyId === b._id} onClick={() => resolve(b, 'deny')}>
              Deny — keep session
            </Button>
            <Button size="sm" disabled={busyId === b._id} onClick={() => resolve(b, 'approve')}>
              Approve & refund student
            </Button>
          </div>
        </div>
        );
      })}
    </div>
  );
}

function UsersTab() {
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch, setData } = useApiData(
    () => api.get(`/admin/users?limit=50${role ? `&role=${role}` : ''}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    [role, search]
  );

  const toggleActive = async (user) => {
    try {
      const result = await api.patch(`/admin/users/${user._id}/status`, { isActive: !user.isActive });
      setData((prev) => ({ ...prev, users: prev.users.map((u) => (u._id === user._id ? result.user : u)) }));
      toast.success(result.user.isActive ? 'User reactivated' : 'User suspended');
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input sm:w-40" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="tutor">Tutors</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {loading ? (
        <SkeletonRows count={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : data.users.length === 0 ? (
        <EmptyState icon="🔍" title="No users found" description="Try a different search or filter." />
      ) : (
        <div className="card divide-y divide-canvas-200">
          {data.users.map((u) => (
            <div key={u._id} className="p-4 flex items-center gap-3">
              <Avatar src={u.avatar} name={u.name} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-medium text-sm text-ink-900 truncate">{u.name}</span>
                  <Badge variant={u.role === 'admin' ? 'gold' : u.role === 'tutor' ? 'forest' : 'neutral'}>{u.role}</Badge>
                  {!u.isActive && <Badge variant="error">Suspended</Badge>}
                </div>
                <div className="text-xs text-ink-400 truncate">{u.email} · joined {format(new Date(u.createdAt), 'MMM yyyy')}</div>
              </div>
              {u.role !== 'admin' && (
                <Button size="sm" variant={u.isActive ? 'danger' : 'secondary'} onClick={() => toggleActive(u)}>
                  {u.isActive ? 'Suspend' : 'Reactivate'}
                </Button>
              )}
              <Link
                to={`/chat/${u._id}`}
                state={{ otherUser: { _id: u._id, name: u.name, avatar: u.avatar } }}
                className="btn-outline btn-sm flex-shrink-0"
              >
                Message
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingsTab() {
  const { data, loading, error, refetch } = useApiData(() => api.get('/admin/bookings'), []);

  if (loading) return <SkeletonRows count={5} />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (data.bookings.length === 0) {
    return <EmptyState icon="📅" title="No bookings yet" description="Platform bookings will appear here." />;
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-canvas-200 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Tutor</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-200">
            {data.bookings.map((b) => (
              <tr key={b._id}>
                <td className="px-4 py-3 text-ink-900">{b.student?.name}</td>
                <td className="px-4 py-3 text-ink-900">{b.tutor?.user?.name}</td>
                <td className="px-4 py-3 text-ink-600">{b.subject}</td>
                <td className="px-4 py-3 text-ink-600">{format(new Date(b.scheduledAt), 'MMM d, yyyy')}</td>
                <td className="px-4 py-3 text-ink-900 font-medium">${(b.payment.amount / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge variant={
                    b.status === 'completed' ? 'success' :
                    b.status === 'confirmed' ? 'forest' :
                    b.status === 'cancelled' ? 'error' : 'warning'
                  }>
                    {b.status}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div>
      <GradientHero size="sm">
        <p className="text-xs font-sans font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgb(var(--brand-gold))' }}>
          Control center
        </p>
        <h1 className="font-serif text-white text-2xl">Admin</h1>
        <p className="text-sm text-white/60 mt-1">Manage tutors, users, and keep an eye on the platform.</p>
      </GradientHero>

      <div className="section py-8">
        <div className="flex gap-1 border-b border-canvas-300 mb-6 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === key ? 'border-accent text-accent' : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab />}
        {tab === 'earnings' && <EarningsTab />}
        {tab === 'approvals' && <ApprovalsTab />}
        {tab === 'cancellations' && <CancellationsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'bookings' && <BookingsTab />}
      </div>
    </div>
  );
}
