import { useState, useEffect, useMemo } from 'react';
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

/** LinkedIn-style "profile strength" bar — nudges people toward completing
 * the fields that actually matter for getting booked / getting approved. */
function ProfileStrength({ percent, missing }) {
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
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
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

  return (
    <div className="min-h-screen bg-canvas-100">
      {/* Cover header, LinkedIn-style */}
      <div className="relative h-40 bg-gradient-to-br from-forest-800 to-forest-600">
        <div className="absolute inset-0 bg-grid-canvas opacity-10" />
      </div>

      <div className="section relative">
        {/* Avatar + identity block overlapping the cover */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-14 pb-6 border-b border-canvas-300">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative flex-shrink-0">
              <Avatar src={user?.avatar} name={user?.name} size="xl" ring className="shadow-[0_4px_16px_rgb(0,0,0,0.12)]" />
              <button
                type="button"
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-white bg-forest-800 shadow-[0_2px_6px_rgb(0,0,0,0.2)] transition-transform hover:scale-105"
                title="Change photo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </button>
            </div>

            <div className="pt-2 sm:pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-ink-900 text-2xl">{user?.name}</h1>
                {user?.role === 'tutor' && (
                  <Badge variant={hasTutorProfile ? 'success' : 'warning'}>
                    {hasTutorProfile ? (tutorMeta?.isApproved ? 'Live' : 'Pending approval') : 'Profile incomplete'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-ink-400 capitalize mt-0.5">
                {user?.role} · {user?.email}
                {personal.location && <> · {personal.location}</>}
              </p>
              {memberSince && <p className="text-xs text-ink-400 mt-1">Member since {memberSince}</p>}
            </div>
          </div>

          {/* Tutor stat strip + public profile link, LinkedIn "view public profile" pattern */}
          {user?.role === 'tutor' && hasTutorProfile && (
            <div className="flex items-center gap-5 pb-1">
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
              {tutorMeta?.id && (
                <Link to={`/tutors/${tutorMeta.id}`} className="btn-outline btn-sm whitespace-nowrap">
                  View public profile →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Body: sidebar nav + content */}
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
      </div>
    </div>
  );
}
