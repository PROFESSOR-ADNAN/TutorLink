import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Programming', 'English', 'Biology', 'History', 'Spanish', 'Economics', 'Music', 'French', 'Statistics'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BecomeTutorPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subjects: [],
    educationLevel: "Bachelor's",
    university: '',
    experience: 0,
    hourlyRate: 20,
    languages: ['English'],
    teachingStyle: '',
    availability: [],
  });

  const toggleSubject = (s) => {
    setForm((f) => ({
      ...f,
      subjects: f.subjects.includes(s) ? f.subjects.filter((x) => x !== s) : [...f.subjects, s],
    }));
  };

  const toggleDay = (day) => {
    const exists = form.availability.find((a) => a.day === day);
    if (exists) {
      setForm((f) => ({ ...f, availability: f.availability.filter((a) => a.day !== day) }));
    } else {
      setForm((f) => ({
        ...f,
        availability: [...f.availability, { day, startTime: '09:00', endTime: '17:00' }],
      }));
    }
  };

  const updateAvailability = (day, field, value) => {
    setForm((f) => ({
      ...f,
      availability: f.availability.map((a) => a.day === day ? { ...a, [field]: value } : a),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.subjects.length === 0) return toast.error('Please select at least one subject');
    setSaving(true);
    try {
      await api.post('/tutors', form);
      toast.success('Tutor profile created! Pending admin approval.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to create profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-display font-extrabold text-gray-900 mb-2">Become a Tutor</h1>
        <p className="text-gray-500">Share your knowledge and earn. Applications are reviewed within 24 hours.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Subjects */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-gray-900 mb-4">What subjects do you teach?</h3>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSubject(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                  form.subjects.includes(s)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {form.subjects.length > 0 && (
            <p className="text-sm text-primary-600 mt-3 font-medium">
              Selected: {form.subjects.join(', ')}
            </p>
          )}
        </div>

        {/* Education & Experience */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-gray-900 mb-4">Background</h3>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label">Education Level</label>
              <select className="input" value={form.educationLevel}
                onChange={(e) => setForm({ ...form, educationLevel: e.target.value })}>
                {["High School", "Bachelor's", "Master's", "PhD", "Other"].map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">University / Institution</label>
              <input className="input" placeholder="e.g. Addis Ababa University"
                value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })} />
            </div>
            <div>
              <label className="label">Years of Experience</label>
              <input type="number" min={0} max={50} className="input"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Hourly Rate (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number" min={1} className="input pl-7"
                  value={form.hourlyRate}
                  onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>

        {/* Teaching style */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-gray-900 mb-4">Teaching Style</h3>
          <textarea rows={4} className="input resize-none"
            placeholder="Describe how you teach. What makes your sessions effective? How do you adapt to different learning styles?"
            value={form.teachingStyle}
            onChange={(e) => setForm({ ...form, teachingStyle: e.target.value })} />
        </div>

        {/* Availability */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-gray-900 mb-4">Weekly Availability</h3>
          <p className="text-sm text-gray-500 mb-4">Select the days you're available and set your hours.</p>
          <div className="space-y-3">
            {DAYS.map((day) => {
              const slot = form.availability.find((a) => a.day === day);
              return (
                <div key={day} className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`w-28 py-2 rounded-lg text-sm font-medium border transition text-center ${
                      slot
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                  {slot && (
                    <div className="flex items-center gap-2">
                      <input type="time" className="input w-32 py-1.5" value={slot.startTime}
                        onChange={(e) => updateAvailability(day, 'startTime', e.target.value)} />
                      <span className="text-gray-400 text-sm">to</span>
                      <input type="time" className="input w-32 py-1.5" value={slot.endTime}
                        onChange={(e) => updateAvailability(day, 'endTime', e.target.value)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3 text-base" disabled={saving}>
          {saving ? 'Submitting…' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
