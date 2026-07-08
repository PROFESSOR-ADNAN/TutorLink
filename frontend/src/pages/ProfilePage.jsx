import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../context/authStore';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import FormField from '../components/ui/FormField';
import { Skeleton } from '../components/ui/Skeleton';

const SUBJECTS_LIST = ['Mathematics', 'Physics', 'Chemistry', 'Programming', 'English', 'Biology', 'History', 'Spanish', 'Economics', 'Music'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EDUCATION_LEVELS = ['High School', "Bachelor's", "Master's", 'PhD', 'Other'];
const LANGUAGES_LIST = ['English', 'Amharic', 'Arabic', 'French', 'Spanish', 'Oromo'];

const NAV_ITEMS = [
  { key: 'personal', label: 'Personal Info', icon: '👤' },
  { key: 'tutor', label: 'Tutor Profile', icon: '🎓', tutorOnly: true },
  { key: 'security', label: 'Password & Security', icon: '🔒' },
];

/** A pill-style toggle used for subjects/languages/days — active vs. inactive */
function Chip({ active, children, ...props }) {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        active
          ? 'bg-forest-800 text-white border-forest-800'
          : 'bg-white text-ink-600 border-canvas-300 hover:border-canvas-400'
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

/** Static (read-only) pill, used in the LinkedIn-style "Skills" view section */
function SkillPill({ children }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-canvas-100 text-ink-700 border border-canvas-300">
      {children}
    </span>
  );
}

/** LinkedIn-style "profile strength" bar — nudges people toward completing
 * the fields that actually matter for getting booked / getting approved. */
function ProfileStrength({ percent, missing, onEdit }) {
  const color = percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-gold-400' : 'bg-red-400';
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="font-sans font-semibold text-sm text-ink-900">Profile strength</span>
        <span className="font-serif text-lg text-ink-900">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-canvas-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {missing.length > 0 ? (
        <p className="text-xs text-ink-400 mt-2.5">
          Add {missing.slice(0, 2).join(' and ')}
          {missing.length > 2 ? `, and ${missing.length - 2} more` : ''} to strengthen your profile.
        </p>
      ) : (
        <p className="text-xs text-emerald-600 mt-2.5 font-medium">Your profile is complete. Nice work.</p>
      )}
      {missing.length > 0 && onEdit && (
        <button onClick={onEdit} className="text-xs font-semibold text-forest-800 hover:underline mt-3">
          Complete your profile →
        </button>
      )}
    </div>
  );
}

/** A LinkedIn "Experience"-style entry: icon + title/subtitle + description */
function EntryRow({ icon, title, subtitle, children }) {
  return (
    <div className="flex gap-4">
      <div className="w-12 h-12 rounded-lg bg-canvas-100 border border-canvas-300 flex items-center justify-center text-xl flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-sans font-semibold text-ink-900 text-sm">{title}</h3>
        {subtitle && <p className="text-sm text-ink-600">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-sans font-semibold text-ink-900 text-base">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [mode, setMode] = useState('view'); // 'view' | 'edit' — LinkedIn-style read profile by default
  const [tab, setTab] = useState('personal');
  const [saving, setSaving] = useState(false);

  const [personal, setPersonal] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    phone: user?.phone || '',
  });

  const [hasTutorProfile, setHasTutorProfile] = useState(false);
  const [loadingTutor, setLoadingTutor] = useState(false);
  const [tutorMeta, setTutorMeta] = useState(null); // _id, averageRating, totalSessions, isApproved
  const [tutorProfile, setTutorProfile] = useState({
    subjects: [],
    educationLevel: "Bachelor's",
    university: '',
    experience: 0,
    hourlyRate: 20,
    languages: ['English'],
    teachingStyle: '',
    availability: [],
  });

  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  // If `user` wasn't fully hydrated yet the moment this component first
  // mounted (e.g. a fast client-side redirect right after signup), backfill
  // the form once real data arrives instead of leaving it permanently blank.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (user && !hydratedRef.current) {
      hydratedRef.current = true;
      setPersonal({
        name: user.name || '',
        bio: user.bio || '',
        location: user.location || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { user: updated } = await api.post('/users/me/avatar', formData);
      updateUser(updated);
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleCoverSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const { user: updated } = await api.post('/users/me/cover', formData);
      updateUser(updated);
      toast.success('Cover photo updated');
    } catch (err) {
      toast.error(err.message || 'Failed to upload cover photo');
    } finally {
      setUploadingCover(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'tutor') return;
    setLoadingTutor(true);
    api
      .get('/tutors/me')
      .then((data) => {
        const t = data.tutor;
        setTutorProfile({
          subjects: t.subjects || [],
          educationLevel: t.educationLevel || "Bachelor's",
          university: t.university || '',
          experience: t.experience || 0,
          hourlyRate: t.hourlyRate || 20,
          languages: t.languages?.length ? t.languages : ['English'],
          teachingStyle: t.teachingStyle || '',
          availability: t.availability || [],
        });
        setTutorMeta({
          id: t._id,
          averageRating: t.averageRating || 0,
          totalSessions: t.totalSessions || 0,
          isApproved: t.isApproved,
        });
        setHasTutorProfile(true);
      })
      .catch(() => setHasTutorProfile(false)) // 404 = no profile yet, that's fine
      .finally(() => setLoadingTutor(false));
  }, [user?.role]);

  const savePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.patch('/users/me', personal);
      updateUser(data.user);
      toast.success('Profile updated');
      setMode('view');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const saveTutorProfile = async (e) => {
    e.preventDefault();
    if (tutorProfile.subjects.length === 0) return toast.error('Select at least one subject');
    if (!tutorProfile.hourlyRate || tutorProfile.hourlyRate < 1) return toast.error('Hourly rate must be at least $1');

    setSaving(true);
    try {
      if (hasTutorProfile) {
        await api.patch('/tutors/me', tutorProfile);
        toast.success('Tutor profile updated');
      } else {
        const data = await api.post('/tutors', tutorProfile);
        setHasTutorProfile(true);
        setTutorMeta({ id: data.tutor?._id, averageRating: 0, totalSessions: 0, isApproved: false });
        toast.success('Tutor profile created — pending admin approval');
      }
      setMode('view');
    } catch (err) {
      toast.error(err.message || 'Failed to save tutor profile');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) return toast.error('Passwords do not match');
    if (passwords.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setSaving(true);
    try {
      await api.patch('/auth/update-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password updated');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const toggleSubject = (s) =>
    setTutorProfile((f) => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s],
    }));

  const toggleLanguage = (l) =>
    setTutorProfile((f) => ({
      ...f,
      languages: f.languages.includes(l) ? f.languages.filter((x) => x !== l) : [...f.languages, l],
    }));

  const toggleDay = (day) => {
    const exists = tutorProfile.availability.find((a) => a.day === day);
    if (exists) {
      setTutorProfile((f) => ({ ...f, availability: f.availability.filter((a) => a.day !== day) }));
    } else {
      setTutorProfile((f) => ({
        ...f,
        availability: [...f.availability, { day, startTime: '09:00', endTime: '17:00' }],
      }));
    }
  };

  const updateAvailabilityTime = (day, field, value) =>
    setTutorProfile((f) => ({
      ...f,
      availability: f.availability.map((a) => (a.day === day ? { ...a, [field]: value } : a)),
    }));

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.tutorOnly || user?.role === 'tutor');

  const goEdit = (tabKey) => {
    setTab(tabKey);
    setMode('edit');
  };

  // ── Profile strength calculation (LinkedIn-style nudge) ──────────────
  const { percent, missing } = useMemo(() => {
    const checks = [
      { done: !!personal.bio, label: 'a short bio' },
      { done: !!personal.location, label: 'your location' },
      { done: !!personal.phone, label: 'a phone number' },
      { done: !!user?.avatar && !user.avatar.includes('defaults/avatar.png'), label: 'a profile photo' },
    ];
    if (user?.role === 'tutor') {
      checks.push(
        { done: tutorProfile.subjects.length > 0, label: 'subjects you teach' },
        { done: !!tutorProfile.teachingStyle, label: 'your teaching style' },
        { done: tutorProfile.availability.length > 0, label: 'your weekly availability' },
        { done: !!tutorProfile.university, label: 'your university' }
      );
    }
    const done = checks.filter((c) => c.done).length;
    return {
      percent: Math.round((done / checks.length) * 100),
      missing: checks.filter((c) => !c.done).map((c) => c.label),
    };
  }, [personal, user, tutorProfile]);

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : null;

  // A short, LinkedIn-style "headline" under the name
  const headline = user?.role === 'tutor'
    ? (hasTutorProfile && tutorProfile.subjects.length > 0
        ? `Tutoring ${tutorProfile.subjects.slice(0, 2).join(' & ')}${tutorProfile.subjects.length > 2 ? ` +${tutorProfile.subjects.length - 2} more` : ''}`
        : 'Tutor on TutorLink')
    : 'Student on TutorLink';

  return (
    <div className="min-h-screen bg-canvas-100">
      {/* Cover header, LinkedIn-style */}
      <div
        className="relative h-40 sm:h-48 bg-gradient-to-br from-forest-800 to-forest-600 bg-cover bg-center"
        style={user?.coverImage ? { backgroundImage: `url(${user.coverImage})` } : undefined}
      >
        {!user?.coverImage && <div className="absolute inset-0 bg-grid-canvas opacity-10" />}
        {/* Dark scrim so the edit button stays legible on any photo */}
        {user?.coverImage && <div className="absolute inset-0 bg-black/10" />}

        <button
          type="button"
          onClick={() => coverInputRef.current?.click()}
          disabled={uploadingCover}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-black/40 hover:bg-black/55 backdrop-blur-sm transition-colors disabled:opacity-60"
        >
          {uploadingCover ? (
            'Uploading…'
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              Edit cover photo
            </>
          )}
        </button>
        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
      </div>

      <div className="section relative">
        {/* Avatar — its own negative-margin wrapper so it overlaps the cover,
            while the name/headline block below stays in normal flow and is
            never covered by the banner regardless of content height. */}
        <div className="relative inline-block -mt-14 sm:-mt-16">
          <Avatar src={user?.avatar} name={user?.name} size="xl" ring className="shadow-[0_4px_16px_rgb(0,0,0,0.12)]" />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-white bg-forest-800 shadow-[0_2px_6px_rgb(0,0,0,0.2)] transition-transform hover:scale-105 disabled:opacity-60"
            title="Change photo"
          >
            {uploadingAvatar ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            )}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </div>

        {/* Identity block + action row — normal document flow, always clear of the cover */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mt-3 pb-6 border-b border-canvas-300">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-ink-900 text-2xl">{user?.name}</h1>
              {user?.role === 'tutor' && (
                <Badge variant={hasTutorProfile ? 'success' : 'warning'}>
                  {hasTutorProfile ? (tutorMeta?.isApproved ? 'Live' : 'Pending approval') : 'Profile incomplete'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-ink-700 font-medium mt-1">{headline}</p>
            <p className="text-sm text-ink-400 mt-0.5">
              {personal.location || 'Location not set'}
              {memberSince && <> · Member since {memberSince}</>}
            </p>
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3 pb-1 flex-wrap">
            {user?.role === 'tutor' && hasTutorProfile && (
              <div className="flex items-center gap-4 mr-2">
                <div className="text-center">
                  <div className="font-serif text-xl text-ink-900">
                    {tutorMeta?.averageRating ? tutorMeta.averageRating.toFixed(1) : '—'}
                  </div>
                  <div className="text-[11px] text-ink-400 uppercase tracking-wide">Rating</div>
                </div>
                <div className="w-px h-8 bg-canvas-300" />
                <div className="text-center">
                  <div className="font-serif text-xl text-ink-900">{tutorMeta?.totalSessions ?? 0}</div>
                  <div className="text-[11px] text-ink-400 uppercase tracking-wide">Sessions</div>
                </div>
              </div>
            )}
            {mode === 'view' ? (
              <>
                {user?.role === 'tutor' && tutorMeta?.id && (
                  <Link to={`/tutors/${tutorMeta.id}`} className="btn-outline btn-sm whitespace-nowrap">
                    View public profile
                  </Link>
                )}
                <button onClick={() => goEdit('personal')} className="btn-primary btn-sm whitespace-nowrap">
                  Edit profile
                </button>
              </>
            ) : (
              <button onClick={() => setMode('view')} className="btn-outline btn-sm whitespace-nowrap">
                ← Back to profile
              </button>
            )}
          </div>
        </div>

        {mode === 'view' ? (
          /* ══════════════════ VIEW MODE — LinkedIn-style read profile ══════════════════ */
          <div className="flex flex-col lg:flex-row gap-6 py-8">
            <div className="flex-1 min-w-0 space-y-4 order-2 lg:order-1">
              {/* About */}
              <SectionCard
                title="About"
                action={<button onClick={() => goEdit('personal')} className="text-ink-400 hover:text-forest-800 transition-colors" title="Edit About">✎</button>}
              >
                {personal.bio ? (
                  <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">{personal.bio}</p>
                ) : (
                  <p className="text-sm text-ink-400 italic">No bio added yet.</p>
                )}
              </SectionCard>

              {user?.role === 'tutor' && (
                loadingTutor ? (
                  <div className="card p-6 space-y-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : hasTutorProfile ? (
                  <>
                    {/* Teaching — LinkedIn "Experience"-style entry */}
                    <SectionCard
                      title="Teaching"
                      action={<button onClick={() => goEdit('tutor')} className="text-ink-400 hover:text-forest-800 transition-colors" title="Edit teaching info">✎</button>}
                    >
                      <EntryRow
                        icon="🎓"
                        title="Tutor · TutorLink"
                        subtitle={`$${tutorProfile.hourlyRate}/hr · ${tutorProfile.experience} ${tutorProfile.experience === 1 ? 'year' : 'years'} of experience`}
                      >
                        {tutorProfile.teachingStyle && (
                          <p className="text-sm text-ink-600 mt-2 leading-relaxed">{tutorProfile.teachingStyle}</p>
                        )}
                      </EntryRow>
                    </SectionCard>

                    {/* Education */}
                    <SectionCard
                      title="Education"
                      action={<button onClick={() => goEdit('tutor')} className="text-ink-400 hover:text-forest-800 transition-colors" title="Edit education">✎</button>}
                    >
                      <EntryRow
                        icon="🏛️"
                        title={tutorProfile.university || 'University not specified'}
                        subtitle={tutorProfile.educationLevel}
                      />
                    </SectionCard>

                    {/* Skills — subjects + languages as pills, LinkedIn "Skills" style */}
                    <SectionCard
                      title="Skills"
                      action={<button onClick={() => goEdit('tutor')} className="text-ink-400 hover:text-forest-800 transition-colors" title="Edit skills">✎</button>}
                    >
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Subjects</p>
                          <div className="flex flex-wrap gap-2">
                            {tutorProfile.subjects.length
                              ? tutorProfile.subjects.map((s) => <SkillPill key={s}>{s}</SkillPill>)
                              : <p className="text-sm text-ink-400 italic">None added yet.</p>}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">Languages</p>
                          <div className="flex flex-wrap gap-2">
                            {tutorProfile.languages.map((l) => <SkillPill key={l}>{l}</SkillPill>)}
                          </div>
                        </div>
                      </div>
                    </SectionCard>

                    {/* Availability */}
                    <SectionCard
                      title="Weekly Availability"
                      action={<button onClick={() => goEdit('tutor')} className="text-ink-400 hover:text-forest-800 transition-colors" title="Edit availability">✎</button>}
                    >
                      {tutorProfile.availability.length ? (
                        <div className="grid sm:grid-cols-2 gap-2">
                          {DAYS.filter((d) => tutorProfile.availability.some((a) => a.day === d)).map((day) => {
                            const slot = tutorProfile.availability.find((a) => a.day === day);
                            return (
                              <div key={day} className="flex items-center justify-between px-3 py-2 rounded-lg bg-canvas-100 text-sm">
                                <span className="font-medium text-ink-700">{day}</span>
                                <span className="text-ink-400">{slot.startTime} – {slot.endTime}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-ink-400 italic">No availability set yet.</p>
                      )}
                    </SectionCard>
                  </>
                ) : (
                  <div className="card p-6 flex items-start gap-4 bg-gold-50 border-gold-200">
                    <span className="text-2xl">🎓</span>
                    <div className="flex-1">
                      <h3 className="font-sans font-semibold text-ink-900 text-sm mb-1">Finish setting up your tutor profile</h3>
                      <p className="text-sm text-gold-800 mb-3">
                        Add your subjects, rate, and availability so students can find and book you.
                      </p>
                      <button onClick={() => goEdit('tutor')} className="btn-primary btn-sm">Set up tutor profile</button>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-72 flex-shrink-0 space-y-4 order-1 lg:order-2">
              <ProfileStrength percent={percent} missing={missing} onEdit={() => goEdit('personal')} />
              <SectionCard title="Contact info">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2 text-ink-600">
                    <span className="text-ink-400">✉</span> {user?.email}
                  </li>
                  <li className="flex items-center gap-2 text-ink-600">
                    <span className="text-ink-400">☎</span> {personal.phone || <span className="text-ink-400 italic">Not added</span>}
                  </li>
                  <li className="flex items-center gap-2 text-ink-600">
                    <span className="text-ink-400">📍</span> {personal.location || <span className="text-ink-400 italic">Not added</span>}
                  </li>
                </ul>
              </SectionCard>
            </aside>
          </div>
        ) : (
          /* ══════════════════ EDIT MODE — tabbed settings forms ══════════════════ */
          <div className="flex flex-col lg:flex-row gap-6 py-8">
            <aside className="w-full lg:w-64 flex-shrink-0 space-y-4">
              <nav className="card p-2 lg:sticky lg:top-20">
                {visibleNavItems.map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-150 ${
                      tab === key ? 'bg-forest-50 text-forest-800' : 'text-ink-600 hover:bg-canvas-100'
                    }`}
                  >
                    <span className="text-base">{icon}</span>
                    {label}
                  </button>
                ))}
              </nav>

              <div className="hidden lg:block">
                <ProfileStrength percent={percent} missing={missing} />
              </div>
            </aside>

            <div className="flex-1 min-w-0 space-y-4">
              {/* Mobile-only strength bar, shown above content instead of sidebar */}
              <div className="lg:hidden">
                <ProfileStrength percent={percent} missing={missing} />
              </div>

              {tab === 'personal' && (
                <form onSubmit={savePersonal}>
                  <Card padding="lg" className="space-y-6">
                    <div>
                      <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Personal Information</h2>
                      <p className="text-sm text-ink-400">This is shown publicly on your profile.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <FormField label="Full name">
                        <input className="input" value={personal.name} onChange={(e) => setPersonal({ ...personal, name: e.target.value })} />
                      </FormField>
                      <FormField label="Location">
                        <input className="input" placeholder="e.g. Addis Ababa, Ethiopia" value={personal.location}
                          onChange={(e) => setPersonal({ ...personal, location: e.target.value })} />
                      </FormField>
                    </div>

                    <FormField label="Phone">
                      <input className="input" placeholder="+251..." value={personal.phone}
                        onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
                    </FormField>

                    <FormField label="Bio" hint={`${personal.bio.length}/500`}>
                      <textarea rows={4} maxLength={500} className="input resize-none"
                        placeholder="Tell people a bit about yourself..."
                        value={personal.bio} onChange={(e) => setPersonal({ ...personal, bio: e.target.value })} />
                    </FormField>

                    <div className="pt-2 border-t border-canvas-200">
                      <Button type="submit" loading={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
                    </div>
                  </Card>
                </form>
              )}

              {tab === 'tutor' && user?.role === 'tutor' && (
                loadingTutor ? (
                  <Card padding="lg" className="space-y-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </Card>
                ) : (
                  <form onSubmit={saveTutorProfile} className="space-y-4">
                    {!hasTutorProfile && (
                      <div className="card p-4 flex items-start gap-3 bg-gold-50 border-gold-200">
                        <span className="text-lg">⚠️</span>
                        <p className="text-sm text-gold-800">
                          You haven't created a tutor profile yet. Fill out the fields below and submit — required fields are{' '}
                          <strong>subjects</strong>, <strong>education level</strong>, and <strong>hourly rate</strong>.
                        </p>
                      </div>
                    )}

                    <Card padding="lg">
                      <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Subjects you teach</h2>
                      <p className="text-sm text-ink-400 mb-4">Select at least one. Required.</p>
                      <div className="flex flex-wrap gap-2">
                        {SUBJECTS_LIST.map((s) => (
                          <Chip key={s} active={tutorProfile.subjects.includes(s)} onClick={() => toggleSubject(s)}>
                            {s}
                          </Chip>
                        ))}
                      </div>
                    </Card>

                    <Card padding="lg">
                      <h2 className="font-sans font-semibold text-ink-900 text-base mb-4">Background</h2>
                      <div className="grid sm:grid-cols-2 gap-5">
                        <FormField label="Education level" required>
                          <select className="input" value={tutorProfile.educationLevel}
                            onChange={(e) => setTutorProfile({ ...tutorProfile, educationLevel: e.target.value })}>
                            {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </FormField>
                        <FormField label="University / Institution">
                          <input className="input" placeholder="e.g. Addis Ababa University" value={tutorProfile.university}
                            onChange={(e) => setTutorProfile({ ...tutorProfile, university: e.target.value })} />
                        </FormField>
                        <FormField label="Years of experience">
                          <input type="number" min={0} max={50} className="input" value={tutorProfile.experience}
                            onChange={(e) => setTutorProfile({ ...tutorProfile, experience: Number(e.target.value) })} />
                        </FormField>
                        <FormField label="Hourly rate (USD)" required>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
                            <input type="number" min={1} className="input pl-7" value={tutorProfile.hourlyRate}
                              onChange={(e) => setTutorProfile({ ...tutorProfile, hourlyRate: Number(e.target.value) })} />
                          </div>
                        </FormField>
                      </div>
                    </Card>

                    <Card padding="lg">
                      <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Languages</h2>
                      <p className="text-sm text-ink-400 mb-4">Languages you can teach in.</p>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGES_LIST.map((l) => (
                          <Chip key={l} active={tutorProfile.languages.includes(l)} onClick={() => toggleLanguage(l)}>
                            {l}
                          </Chip>
                        ))}
                      </div>
                    </Card>

                    <Card padding="lg">
                      <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Teaching style</h2>
                      <p className="text-sm text-ink-400 mb-4">Shown on your public profile. Optional.</p>
                      <textarea rows={4} maxLength={500} className="input resize-none"
                        placeholder="Describe how you teach and what makes your sessions effective..."
                        value={tutorProfile.teachingStyle}
                        onChange={(e) => setTutorProfile({ ...tutorProfile, teachingStyle: e.target.value })} />
                      <p className="text-xs text-ink-400 mt-1">{tutorProfile.teachingStyle.length}/500</p>
                    </Card>

                    <Card padding="lg">
                      <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Weekly availability</h2>
                      <p className="text-sm text-ink-400 mb-4">Select days you're available, then set hours. Optional.</p>
                      <div className="space-y-2.5">
                        {DAYS.map((day) => {
                          const slot = tutorProfile.availability.find((a) => a.day === day);
                          return (
                            <div key={day} className="flex items-center gap-3 flex-wrap">
                              <Chip active={!!slot} onClick={() => toggleDay(day)} className="w-24 justify-center">
                                {day.slice(0, 3)}
                              </Chip>
                              {slot && (
                                <div className="flex items-center gap-2">
                                  <input type="time" className="input py-1.5 w-32" value={slot.startTime}
                                    onChange={(e) => updateAvailabilityTime(day, 'startTime', e.target.value)} />
                                  <span className="text-ink-400 text-sm">to</span>
                                  <input type="time" className="input py-1.5 w-32" value={slot.endTime}
                                    onChange={(e) => updateAvailabilityTime(day, 'endTime', e.target.value)} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Card>

                    <div className="flex items-center gap-3">
                      <Button type="submit" loading={saving}>
                        {saving ? 'Saving…' : hasTutorProfile ? 'Save changes' : 'Create tutor profile'}
                      </Button>
                      {hasTutorProfile && (
                        <span className="text-xs text-ink-400">Changes to subjects or rate may require re-approval</span>
                      )}
                    </div>
                  </form>
                )
              )}

              {tab === 'security' && (
                <form onSubmit={savePassword}>
                  <Card padding="lg" className="space-y-5 max-w-md">
                    <div>
                      <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Change password</h2>
                      <p className="text-sm text-ink-400">Choose a strong password you don't use elsewhere.</p>
                    </div>
                    <FormField label="Current password">
                      <input type="password" className="input" required value={passwords.currentPassword}
                        onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                    </FormField>
                    <FormField label="New password">
                      <input type="password" className="input" required minLength={8} value={passwords.newPassword}
                        onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
                    </FormField>
                    <FormField label="Confirm new password">
                      <input type="password" className="input" required value={passwords.confirm}
                        onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
                    </FormField>
                    <Button type="submit" loading={saving}>{saving ? 'Updating…' : 'Update password'}</Button>
                  </Card>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
