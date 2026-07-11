import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../context/authStore';
import Avatar from '../components/ui/Avatar';

function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <svg key={s} className={`w-4 h-4 ${s <= Math.round(rating) ? 'star-filled' : 'star-empty'}`} viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

export default function TutorProfilePage() {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuthStore();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get(`/tutors/${id}`), api.get(`/reviews/tutor/${id}`)])
      .then(([t, r]) => { setTutor(t.tutor); setReviews(r.reviews); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="section py-10 animate-pulse space-y-4">
      <div className="h-48 bg-canvas-300 rounded-2xl" />
      <div className="h-64 bg-canvas-200 rounded-2xl" />
    </div>
  );

  if (!tutor) return (
    <div className="section py-20 text-center">
      <h2 className="font-serif text-2xl text-ink-900 mb-3">Tutor not found</h2>
      <Link to="/tutors" className="btn-primary">Back to tutors</Link>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* Hero strip */}
      <div style={{ background: '#fff', borderBottom: '1px solid #EAEAE3' }}>
        <div className="section py-8">
          <Link to="/tutors" className="inline-flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 transition-colors mb-6">
            ← All tutors
          </Link>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="relative flex-shrink-0">
              <Avatar src={tutor.user?.avatar} name={tutor.user?.name} size="xl" className="!w-20 !h-20 !rounded-2xl" />
              <span className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-green-400 rounded-full ring-2 ring-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-serif text-ink-900 mb-0.5" style={{ fontSize: '1.75rem' }}>{tutor.user?.name}</h1>
              <p className="text-sm text-ink-400 mb-3">
                {tutor.educationLevel}{tutor.university ? ` · ${tutor.university}` : ''}
                {tutor.user?.location ? ` · ${tutor.user.location}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Stars rating={tutor.averageRating} />
                  <span className="text-sm font-medium text-ink-700">
                    {tutor.averageRating > 0 ? tutor.averageRating.toFixed(1) : 'New'}
                  </span>
                  <span className="text-sm text-ink-400">({tutor.totalReviews} reviews)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tutor.subjects.map(s => <span key={s} className="badge badge-forest">{s}</span>)}
                </div>
              </div>
            </div>
            {/* Booking CTA — sticky */}
            <div className="w-full sm:w-auto">
              <div className="card p-5 min-w-[200px]">
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="font-serif text-3xl text-ink-900">${tutor.hourlyRate}</span>
                  <span className="text-sm text-ink-400">/hr</span>
                </div>
                {isAuthenticated && user?.role === 'student' ? (
                  <Link to={`/book/${tutor._id}`} className="btn-primary w-full justify-center">
                    Book a session
                  </Link>
                ) : !isAuthenticated ? (
                  <Link to="/register" className="btn-primary w-full justify-center">Sign up to book</Link>
                ) : (
                  <button className="btn-outline w-full justify-center" disabled>Book a session</button>
                )}

                {isAuthenticated && user?._id !== tutor.user?._id && (
                  <Link
                    to={`/chat/${tutor.user?._id}`}
                    state={{ otherUser: { _id: tutor.user?._id, name: tutor.user?.name, avatar: tutor.user?.avatar, role: 'tutor' } }}
                    className="btn-outline w-full justify-center mt-2"
                  >
                    Message
                  </Link>
                )}

                <p className="text-xs text-center text-ink-400 mt-3">No charge until confirmed</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="section py-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Sessions', value: tutor.totalSessions },
              { label: 'Experience', value: `${tutor.experience}y` },
              { label: 'Languages', value: tutor.languages?.length || 1 },
            ].map(({ label, value }) => (
              <div key={label} className="card p-4 text-center">
                <div className="font-serif text-2xl text-accent mb-0.5">{value}</div>
                <div className="text-xs text-ink-400 font-medium">{label}</div>
              </div>
            ))}
          </div>

          {/* About */}
          {tutor.user?.bio && (
            <div className="card p-6">
              <h3 className="font-sans font-semibold text-ink-900 text-sm mb-3">About</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{tutor.user.bio}</p>
            </div>
          )}

          {/* Teaching style */}
          {tutor.teachingStyle && (
            <div className="card p-6">
              <h3 className="font-sans font-semibold text-ink-900 text-sm mb-3">Teaching style</h3>
              <p className="text-sm text-ink-600 leading-relaxed">{tutor.teachingStyle}</p>
            </div>
          )}

          {/* Reviews */}
          <div className="card p-6">
            <h3 className="font-sans font-semibold text-ink-900 text-sm mb-5">
              Reviews
              <span className="ml-2 font-normal text-ink-400">({reviews.length})</span>
            </h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-ink-400">No reviews yet — be the first to leave one!</p>
            ) : (
              <div className="space-y-5">
                {reviews.map(review => (
                  <div key={review._id} className="flex gap-4 pb-5 last:pb-0" style={{ borderBottom: '1px solid #F4F4EF' }}>
                    <Avatar src={review.student?.avatar} name={review.student?.name} size="sm" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-sans font-medium text-sm text-ink-900">{review.student?.name}</span>
                        <Stars rating={review.rating} />
                        <span className="text-xs text-ink-400 ml-auto">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-ink-600 leading-relaxed">{review.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Availability */}
          {tutor.availability?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-sans font-semibold text-ink-900 text-sm mb-4">Availability</h3>
              <div className="space-y-2">
                {tutor.availability.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink-700">{slot.day.slice(0,3)}</span>
                    <span className="text-ink-400">{slot.startTime} – {slot.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {tutor.languages?.length > 0 && (
            <div className="card p-5">
              <h3 className="font-sans font-semibold text-ink-900 text-sm mb-3">Languages</h3>
              <div className="flex flex-wrap gap-1.5">
                {tutor.languages.map(l => <span key={l} className="badge badge-neutral">{l}</span>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
