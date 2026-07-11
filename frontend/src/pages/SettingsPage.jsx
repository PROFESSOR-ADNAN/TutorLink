import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import useAuthStore from '../context/authStore';
import { useTheme } from '../context/ThemeContext';

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3.5 cursor-pointer">
      <div>
        <div className="text-sm font-medium text-ink-900">{label}</div>
        {description && <div className="text-xs text-ink-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-forest-800' : 'bg-canvas-400'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </label>
  );
}

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' },
];

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const { mode, setMode } = useTheme();
  const [prefs, setPrefs] = useState({
    bookingUpdates: user?.preferences?.emailNotifications?.bookingUpdates ?? true,
    newMessages: user?.preferences?.emailNotifications?.newMessages ?? true,
    marketing: user?.preferences?.emailNotifications?.marketing ?? false,
  });
  const [saving, setSaving] = useState(false);

  // Theme applies instantly (it's a local, low-stakes preference), then
  // syncs to the account in the background so it's remembered on other
  // devices too.
  const handleThemeChange = async (value) => {
    setMode(value);
    try {
      await api.patch('/users/me', {
        preferences: { ...user?.preferences, theme: value },
      });
    } catch {
      // Non-critical — the theme still applied locally even if the sync failed.
    }
  };

  const savePrefs = async () => {
    setSaving(true);
    try {
      const data = await api.patch('/users/me', {
        preferences: {
          theme: mode,
          emailNotifications: prefs,
        },
      });
      updateUser(data.user);
      toast.success('Preferences saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/profile" className="text-ink-400 hover:text-ink-700 p-1" aria-label="Back to profile">←</Link>
        <div>
          <h1 className="font-serif text-2xl text-ink-900">Settings</h1>
          <p className="text-sm text-ink-400">Manage how TutorLink looks and notifies you.</p>
        </div>
      </div>

      {/* Appearance */}
      <div className="card p-6 mb-5">
        <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Appearance</h2>
        <p className="text-sm text-ink-400 mb-4">Choose how TutorLink looks on this device.</p>
        <div className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className={`flex flex-col items-center gap-1.5 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                mode === value
                  ? 'border-forest-800 bg-forest-50 text-accent'
                  : 'border-canvas-300 text-ink-600 hover:border-canvas-400'
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Email notifications */}
      <div className="card p-6 mb-5">
        <h2 className="font-sans font-semibold text-ink-900 text-base mb-1">Email notifications</h2>
        <p className="text-sm text-ink-400 mb-1">Choose what TutorLink emails you about.</p>
        <div className="divide-y divide-canvas-200">
          <Toggle
            label="Booking updates"
            description="Confirmations, reminders, and cancellations"
            checked={prefs.bookingUpdates}
            onChange={(v) => setPrefs({ ...prefs, bookingUpdates: v })}
          />
          <Toggle
            label="New messages"
            description="When someone sends you a message"
            checked={prefs.newMessages}
            onChange={(v) => setPrefs({ ...prefs, newMessages: v })}
          />
          <Toggle
            label="Product updates & offers"
            description="Occasional news from TutorLink"
            checked={prefs.marketing}
            onChange={(v) => setPrefs({ ...prefs, marketing: v })}
          />
        </div>
      </div>

      <button onClick={savePrefs} disabled={saving} className="btn-primary px-6 disabled:opacity-60">
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
