import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../services/api';
import useApiData from '../hooks/useApiData';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import { SkeletonRows } from '../components/ui/Skeleton';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'approvals', label: 'Tutor Approvals' },
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
    <div className="section py-10">
      <div className="mb-8">
        <h1 className="font-serif text-2xl text-ink-900">Admin</h1>
        <p className="text-sm text-ink-400">Manage tutors, users, and keep an eye on the platform.</p>
      </div>

      <div className="flex gap-1 border-b border-canvas-300 mb-6 overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === key ? 'border-forest-800 text-accent' : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'approvals' && <ApprovalsTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'bookings' && <BookingsTab />}
    </div>
  );
}
