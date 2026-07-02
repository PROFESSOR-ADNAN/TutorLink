import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../context/authStore';
import toast from 'react-hot-toast';

const SUBJECTS_LIST = ['Mathematics', 'Physics', 'Chemistry', 'Programming', 'English', 'Biology', 'History', 'Spanish', 'Economics', 'Music'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const EDUCATION_LEVELS = ['High School', "Bachelor's", "Master's", 'PhD', 'Other'];
const LANGUAGES_LIST = ['English', 'Amharic', 'Arabic', 'French', 'Spanish', 'Oromo'];

// ── Sidebar nav config ────────────────────────────────────
const NAV_ITEMS = [
  { key: 'personal', label: 'Personal Info', icon: '👤' },
  { key: 'tutor',     label: 'Tutor Profile', icon: '🎓', tutorOnly: true },
  { key: 'security',  label: 'Password & Security', icon: '🔒' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [tab, setTab] = useState('personal');
  const [saving, setSaving] = useState(false);

  // ── Personal info state (hits /users/me) ─────────────────
  const [personal, setPersonal] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
    phone: user?.phone || '',
  });

  // ── Tutor profile state (hits /tutors or /tutors/me) ─────
  const [hasTutorProfile, setHasTutorProfile] = useState(false);
  const [loadingTutor, setLoadingTutor] = useState(false);
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

  // ── Password state ────────────────────────────────────────
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });

  // Load existing tutor profile if the user is a tutor
  useEffect(() => {
    if (user?.role !== 'tutor') return;
    setLoadingTutor(true);
    api.get('/tutors/me')
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
        setHasTutorProfile(true);
      })
      .catch(() => setHasTutorProfile(false)) // 404 = no profile yet, that's fine
      .finally(() => setLoadingTutor(false));
  }, [user?.role]);

  // ── Save personal info → PATCH /users/me ──────────────────
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

  // ── Save tutor profile → POST or PATCH /tutors ────────────
  const saveTutorProfile = async (e) => {
    e.preventDefault();

    if (tutorProfile.subjects.length === 0) {
      return toast.error('Select at least one subject');
    }
    if (!tutorProfile.hourlyRate || tutorProfile.hourlyRate < 1) {
      return toast.error('Hourly rate must be at least $1');
    }

    setSaving(true);
    try {
      if (hasTutorProfile) {
        await api.patch('/tutors/me', tutorProfile);
        toast.success('Tutor profile updated');
      } else {
        await api.post('/tutors', tutorProfile);
        setHasTutorProfile(true);
        toast.success('Tutor profile created — pending admin approval');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save tutor profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Save password → PATCH /auth/update-password ──────────
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

  // ── Tutor form helpers ─────────────────────────────────────
  const toggleSubject = (s) => {
    setTutorProfile((f) => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s],
    }));
  };

  const toggleLanguage = (l) => {
    setTutorProfile((f) => ({
      ...f,
      languages: f.languages.includes(l) ? f.languages.filter((x) => x !== l) : [...f.languages, l],
    }));
  };

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

  const updateAvailabilityTime = (day, field, value) => {
    setTutorProfile((f) => ({
      ...f,
      availability: f.availability.map((a) => (a.day === day ? { ...a, [field]: value } : a)),
    }));
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.tutorOnly || user?.role === 'tutor');

  return (
    <div className="min-h-screen" style={{ background: '#FAFAF7' }}>
      {/* ── Cover header (Facebook/LinkedIn style) ───────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1B4332, #2d6652)' }} className="relative h-40">
        <div className="absolute inset-0 bg-grid-canvas opacity-10" />
      </div>

      <div className="section relative">
        {/* Avatar overlapping the cover */}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 pb-6"
          style={{ borderBottom: '1px solid #EAEAE3' }}>
          <div className="relative flex-shrink-0">
            <img
              src={user?.avatar}
              alt={user?.name}
              className="w-28 h-28 rounded-2xl object-cover ring-4 ring-white"
              style={{ boxShadow: '0 4px 16px rgb(0 0 0 / 0.12)' }}
            />
            <button
              type="button"
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-white transition-transform hover:scale-105"
              style={{ background: '#1B4332', boxShadow: '0 2px 6px rgb(0 0 0 / 0.2)' }}
              title="Change photo"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </button>
          </div>

          <div className="flex-1 pt-2 sm:pb-1">
            <h1 className="font-serif text-ink-900" style={{ fontSize: '1.5rem' }}>{user?.name}</h1>
            <p className="text-sm text-ink-400 capitalize mt-0.5">
              {user?.role} · {user?.email}
              {user?.role === 'tutor' && (
                <span className={`ml-2 badge ${hasTutorProfile ? 'badge-success' : 'badge-warning'}`}>
                  {hasTutorProfile ? 'Profile live' : 'Profile incomplete'}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* ── Body: sidebar nav + content card ─────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6 py-8">

          {/* Sidebar nav — sticky on desktop, like LinkedIn settings */}
          <aside className="w-full lg:w-56 flex-shrink-0">
            <nav className="card p-2 lg:sticky lg:top-20">
              {visibleNavItems.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-150"
                  style={tab === key
                    ? { background: '#f0f7f4', color: '#1B4332' }
                    : { background: 'transparent', color: '#4A4A42' }
                  }
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* ── Content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* ── Personal Info tab ──────────────────────────────── */}
            {tab === 'personal' && (
              <form onSubmit={savePersonal} className="card p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Personal Information</h2>
                  <p className="text-sm text-ink-400">This is shown publicly on your profile.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="label">Full name</label>
                    <input className="input" value={personal.name}
                      onChange={(e) => setPersonal({ ...personal, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Location</label>
                    <input className="input" placeholder="e.g. Addis Ababa, Ethiopia" value={personal.location}
                      onChange={(e) => setPersonal({ ...personal, location: e.target.value })} />
                  </div>
                </div>

                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+251..." value={personal.phone}
                    onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} />
                </div>

                <div>
                  <label className="label">Bio</label>
                  <textarea rows={4} maxLength={500} className="input resize-none"
                    placeholder="Tell people a bit about yourself..."
                    value={personal.bio}
                    onChange={(e) => setPersonal({ ...personal, bio: e.target.value })} />
                  <p className="text-xs text-ink-400 mt-1">{personal.bio.length}/500</p>
                </div>

                <div className="pt-2" style={{ borderTop: '1px solid #F4F4EF' }}>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            )}

            {/* ── Tutor Profile tab ──────────────────────────────── */}
            {tab === 'tutor' && user?.role === 'tutor' && (
              loadingTutor ? (
                <div className="card p-8 animate-pulse space-y-4">
                  <div className="h-4 bg-canvas-300 rounded w-1/3" />
                  <div className="h-10 bg-canvas-200 rounded" />
                  <div className="h-10 bg-canvas-200 rounded" />
                </div>
              ) : (
                <form onSubmit={saveTutorProfile} className="space-y-5">

                  {!hasTutorProfile && (
                    <div className="card p-4 flex items-start gap-3"
                      style={{ background: '#faf3d0', borderColor: '#eccf62' }}>
                      <span className="text-lg">⚠️</span>
                      <p className="text-sm" style={{ color: '#7f570d' }}>
                        You haven't created a tutor profile yet. Fill out the fields below and submit — required fields are <strong>subjects</strong>, <strong>education level</strong>, and <strong>hourly rate</strong>.
                      </p>
                    </div>
                  )}

                  {/* Subjects */}
                  <div className="card p-6 sm:p-8">
                    <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Subjects you teach</h2>
                    <p className="text-sm text-ink-400 mb-4">Select at least one. Required.</p>
                    <div className="flex flex-wrap gap-2">
                      {SUBJECTS_LIST.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleSubject(s)}
                          className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                          style={tutorProfile.subjects.includes(s)
                            ? { background: '#1B4332', color: '#fff', borderColor: '#1B4332' }
                            : { background: '#fff', color: '#4A4A42', borderColor: '#EAEAE3' }
                          }
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background */}
                  <div className="card p-6 sm:p-8">
                    <h2 className="font-sans font-semibold text-ink-900 text-base mb-4">Background</h2>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="label">Education level <span style={{ color: '#dc2626' }}>*</span></label>
                        <select className="input" value={tutorProfile.educationLevel}
                          onChange={(e) => setTutorProfile({ ...tutorProfile, educationLevel: e.target.value })}>
                          {EDUCATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">University / Institution</label>
                        <input className="input" placeholder="e.g. Addis Ababa University"
                          value={tutorProfile.university}
                          onChange={(e) => setTutorProfile({ ...tutorProfile, university: e.target.value })} />
                      </div>
                      <div>
                        <label className="label">Years of experience</label>
                        <input type="number" min={0} max={50} className="input"
                          value={tutorProfile.experience}
                          onChange={(e) => setTutorProfile({ ...tutorProfile, experience: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label className="label">Hourly rate (USD) <span style={{ color: '#dc2626' }}>*</span></label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
                          <input type="number" min={1} className="input pl-7"
                            value={tutorProfile.hourlyRate}
                            onChange={(e) => setTutorProfile({ ...tutorProfile, hourlyRate: Number(e.target.value) })} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="card p-6 sm:p-8">
                    <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Languages</h2>
                    <p className="text-sm text-ink-400 mb-4">Languages you can teach in.</p>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGES_LIST.map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => toggleLanguage(l)}
                          className="px-3 py-1.5 rounded-full text-sm font-medium border transition-all"
                          style={tutorProfile.languages.includes(l)
                            ? { background: '#D4A017', color: '#141410', borderColor: '#D4A017' }
                            : { background: '#fff', color: '#4A4A42', borderColor: '#EAEAE3' }
                          }
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Teaching style */}
                  <div className="card p-6 sm:p-8">
                    <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Teaching style</h2>
                    <p className="text-sm text-ink-400 mb-4">Shown on your public profile. Optional.</p>
                    <textarea rows={4} maxLength={500} className="input resize-none"
                      placeholder="Describe how you teach and what makes your sessions effective..."
                      value={tutorProfile.teachingStyle}
                      onChange={(e) => setTutorProfile({ ...tutorProfile, teachingStyle: e.target.value })} />
                    <p className="text-xs text-ink-400 mt-1">{tutorProfile.teachingStyle.length}/500</p>
                  </div>

                  {/* Availability */}
                  <div className="card p-6 sm:p-8">
                    <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Weekly availability</h2>
                    <p className="text-sm text-ink-400 mb-4">Select days you're available, then set hours. Optional.</p>
                    <div className="space-y-2.5">
                      {DAYS.map((day) => {
                        const slot = tutorProfile.availability.find((a) => a.day === day);
                        return (
                          <div key={day} className="flex items-center gap-3 flex-wrap">
                            <button
                              type="button"
                              onClick={() => toggleDay(day)}
                              className="w-24 py-2 rounded-lg text-sm font-medium border transition-all text-center flex-shrink-0"
                              style={slot
                                ? { background: '#1B4332', color: '#fff', borderColor: '#1B4332' }
                                : { background: '#fff', color: '#4A4A42', borderColor: '#EAEAE3' }
                              }
                            >
                              {day.slice(0, 3)}
                            </button>
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
                  </div>

                  <div className="flex items-center gap-3">
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Saving…' : hasTutorProfile ? 'Save changes' : 'Create tutor profile'}
                    </button>
                    {hasTutorProfile && (
                      <span className="text-xs text-ink-400">Changes to subjects or rate may require re-approval</span>
                    )}
                  </div>
                </form>
              )
            )}

            {/* ── Security tab ───────────────────────────────────── */}
            {tab === 'security' && (
              <form onSubmit={savePassword} className="card p-6 sm:p-8 space-y-5 max-w-md">
                <div>
                  <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Change password</h2>
                  <p className="text-sm text-ink-400">Choose a strong password you don't use elsewhere.</p>
                </div>

                <div>
                  <label className="label">Current password</label>
                  <input type="password" className="input" required value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
                </div>
                <div>
                  <label className="label">New password</label>
                  <input type="password" className="input" required minLength={8} value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
                </div>
                <div>
                  <label className="label">Confirm new password</label>
                  <input type="password" className="input" required value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
                </div>

                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Updating…' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}