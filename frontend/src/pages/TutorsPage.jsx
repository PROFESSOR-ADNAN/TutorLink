import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';

const SUBJECTS = ['Mathematics','Physics','Chemistry','Programming','English','Biology','History','Spanish','Economics','Music'];

function Stars({ rating, small }) {
  const sz = small ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`${sz} ${s <= Math.round(rating) ? 'star-filled' : 'star-empty'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

function TutorCard({ tutor }) {
  return (
    <Link to={`/tutors/${tutor._id}`} className="card-hover block group">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <img src={tutor.user?.avatar} alt={tutor.user?.name}
              className="w-12 h-12 rounded-xl object-cover" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full ring-2 ring-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-sans font-semibold text-ink-900 text-sm leading-tight truncate group-hover:text-forest-800 transition-colors">
              {tutor.user?.name}
            </h3>
            <p className="text-xs text-ink-400 mt-0.5 truncate">{tutor.educationLevel}{tutor.university ? ` · ${tutor.university}` : ''}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Stars rating={tutor.averageRating} small />
              <span className="text-xs text-ink-500 font-medium">
                {tutor.averageRating > 0 ? tutor.averageRating.toFixed(1) : 'New'}
              </span>
              <span className="text-ink-300 text-xs">·</span>
              <span className="text-xs text-ink-400">{tutor.totalSessions} sessions</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-serif text-xl text-ink-900" style={{ letterSpacing: '-0.02em' }}>${tutor.hourlyRate}</div>
            <div className="text-xs text-ink-400">/hr</div>
          </div>
        </div>

        {/* Bio snippet */}
        {tutor.user?.bio && (
          <p className="text-xs text-ink-500 leading-relaxed mb-4 line-clamp-2">{tutor.user.bio}</p>
        )}

        {/* Subject badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tutor.subjects.slice(0, 4).map(s => (
            <span key={s} className="badge badge-forest">{s}</span>
          ))}
          {tutor.subjects.length > 4 && (
            <span className="badge badge-neutral">+{tutor.subjects.length - 4}</span>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-canvas-200 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <span>{tutor.experience}y exp.</span>
            <span className="text-ink-200">·</span>
            <span>{tutor.languages?.[0] || 'English'}</span>
          </div>
          <span className="text-xs font-medium transition-colors" style={{ color: '#1B4332' }}>
            View profile →
          </span>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="flex gap-4 mb-4">
        <div className="w-12 h-12 bg-canvas-300 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-canvas-300 rounded w-3/4" />
          <div className="h-3 bg-canvas-200 rounded w-1/2" />
          <div className="h-3 bg-canvas-200 rounded w-1/3" />
        </div>
        <div className="w-12 space-y-1">
          <div className="h-5 bg-canvas-300 rounded" />
          <div className="h-3 bg-canvas-200 rounded" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3 bg-canvas-200 rounded" />
        <div className="h-3 bg-canvas-200 rounded w-4/5" />
      </div>
      <div className="flex gap-2 mb-4">
        <div className="h-5 bg-canvas-200 rounded-full w-16" />
        <div className="h-5 bg-canvas-200 rounded-full w-20" />
      </div>
      <div className="pt-4 border-t border-canvas-200 h-3 bg-canvas-200 rounded w-1/2" />
    </div>
  );
}

export default function TutorsPage() {
  const [searchParams] = useSearchParams();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    subject: searchParams.get('subject') || '',
    minRate: '',
    maxRate: '',
    minRating: '',
    sort: '-averageRating',
  });

  const fetchTutors = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const data = await api.get(`/tutors?${params}`);
      setTutors(data.tutors);
      setPagination(data.pagination);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchTutors(1); }, [fetchTutors]);

  const clearFilters = () => setFilters({ subject: '', minRate: '', maxRate: '', minRating: '', sort: '-averageRating' });
  const hasFilters = filters.subject || filters.minRate || filters.maxRate || filters.minRating;

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Page header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EAEAE3' }}>
        <div className="section py-8">
          <h1 className="font-serif text-ink-900 mb-1" style={{ fontSize: '1.75rem' }}>Find a Tutor</h1>
          <p className="text-sm text-ink-400">
            {loading ? 'Loading…' : `${pagination.total || 0} verified tutors available`}
          </p>
        </div>
      </div>

      <div className="section py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Sidebar ──────────────────────────────────── */}
          <aside className="w-full lg:w-60 flex-shrink-0 space-y-1">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-sans font-semibold text-xs uppercase tracking-widest text-ink-500">Filters</h3>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-forest-800 hover:text-forest-700 font-medium">
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-5">
                <div>
                  <label className="label text-xs">Subject</label>
                  <select className="input text-sm py-2" value={filters.subject}
                    onChange={e => setFilters({ ...filters, subject: e.target.value })}>
                    <option value="">All subjects</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label text-xs">Minimum rating</label>
                  <div className="space-y-1">
                    {[['', 'Any'], ['3', '3+ ★'], ['4', '4+ ★'], ['4.5', '4.5+ ★']].map(([val, label]) => (
                      <button key={val} onClick={() => setFilters({ ...filters, minRating: val })}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all"
                        style={filters.minRating === val
                          ? { background: '#f0f7f4', color: '#1B4332', fontWeight: 500 }
                          : { color: '#4A4A42' }
                        }>
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${filters.minRating === val ? 'border-forest-800 bg-forest-800' : 'border-canvas-400'}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label text-xs">Rate (USD/hr)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" className="input text-sm py-2 w-1/2" min="0"
                      value={filters.minRate} onChange={e => setFilters({ ...filters, minRate: e.target.value })} />
                    <input type="number" placeholder="Max" className="input text-sm py-2 w-1/2" min="0"
                      value={filters.maxRate} onChange={e => setFilters({ ...filters, maxRate: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="label text-xs">Sort by</label>
                  <select className="input text-sm py-2" value={filters.sort}
                    onChange={e => setFilters({ ...filters, sort: e.target.value })}>
                    <option value="-averageRating">Highest rated</option>
                    <option value="hourlyRate">Lowest price</option>
                    <option value="-hourlyRate">Highest price</option>
                    <option value="-totalSessions">Most experienced</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Grid ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : tutors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background: '#F4F4EF' }}>
                  <svg className="w-8 h-8 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <h3 className="font-sans font-semibold text-ink-900 mb-2">No tutors found</h3>
                <p className="text-sm text-ink-400 mb-5">Try adjusting your filters</p>
                <button onClick={clearFilters} className="btn-primary btn-sm">Clear filters</button>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {tutors.map(t => <TutorCard key={t._id} tutor={t} />)}
                </div>

                {pagination.pages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-10">
                    <button disabled={currentPage === 1} onClick={() => fetchTutors(currentPage - 1)}
                      className="btn-outline btn-sm disabled:opacity-40">← Prev</button>
                    {[...Array(pagination.pages)].map((_, i) => (
                      <button key={i} onClick={() => fetchTutors(i + 1)}
                        className="w-9 h-9 rounded-lg text-sm font-medium transition-all"
                        style={currentPage === i + 1
                          ? { background: '#1B4332', color: '#fff' }
                          : { background: '#fff', color: '#4A4A42', border: '1px solid #EAEAE3' }
                        }>
                        {i + 1}
                      </button>
                    ))}
                    <button disabled={currentPage === pagination.pages} onClick={() => fetchTutors(currentPage + 1)}
                      className="btn-outline btn-sm disabled:opacity-40">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
