import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../context/authStore';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to TutorLink.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex bg-canvas-100">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#141410', maxWidth: '440px' }}>
        <div className="absolute inset-0 bg-grid-canvas opacity-5" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: '#1B4332' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M3 3h4a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" fill="white" fillOpacity="0.9"/>
                <path d="M9 5h4a1 1 0 011 1v7a1 1 0 01-1 1H9" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-serif text-base text-white">TutorLink</span>
          </Link>
        </div>
        <div className="relative z-10">
          <div className="flex gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <svg key={i} className="w-4 h-4" style={{ color: '#D4A017' }} viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            ))}
          </div>
          <p className="font-serif text-white text-xl leading-snug mb-5">
            "I found a Python tutor in under 10 minutes. We've been working together for 3 months now."
          </p>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-forest-800 flex items-center justify-center text-white text-xs font-semibold">BT</div>
            <div>
              <div className="text-sm font-medium text-white">Biruk Tadesse</div>
              <div className="text-xs" style={{ color: 'rgb(255 255 255 / 0.45)' }}>Programming student, Addis Ababa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-serif text-ink-900 mb-1" style={{ fontSize: '1.75rem' }}>Create your account</h1>
          <p className="font-sans text-sm text-ink-400 mb-8">Free to join. No credit card required.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role toggle */}
            <div>
              <label className="label">I want to…</label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: '#EAEAE3' }}>
                {[
                  { value: 'student', label: 'Find a tutor', icon: '📚' },
                  { value: 'tutor',   label: 'Teach students', icon: '🎓' },
                ].map(({ value, label, icon }) => (
                  <button key={value} type="button" onClick={() => setForm({ ...form, role: value })}
                    className="py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2"
                    style={form.role === value
                      ? { background: '#fff', color: '#1B4332', boxShadow: '0 1px 3px rgb(0 0 0 / 0.1)' }
                      : { background: 'transparent', color: '#6B6B61' }
                    }
                  >
                    <span>{icon}</span> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Full name</label>
              <input type="text" required className="input" placeholder="Adnan Ahmed"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required className="input pr-10"
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {showPass
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                      : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></>
                    }
                  </svg>
                </button>
              </div>
              {/* Strength bar */}
              {form.password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[4, 7, 10].map((threshold, i) => (
                    <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{ background: form.password.length >= threshold ? (i === 0 ? '#ef4444' : i === 1 ? '#D4A017' : '#1B4332') : '#EAEAE3' }} />
                  ))}
                  <span className="text-xs ml-1" style={{ color: '#8C8C82' }}>
                    {form.password.length < 4 ? 'Weak' : form.password.length < 7 ? 'Fair' : form.password.length < 10 ? 'Good' : 'Strong'}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 mt-2 text-sm">
              {loading
                ? <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Creating account…
                  </span>
                : 'Create account'
              }
            </button>

            <p className="text-xs text-center text-ink-400">
              By signing up you agree to our{' '}
              <a href="#" className="underline hover:text-ink-700">Terms</a> and{' '}
              <a href="#" className="underline hover:text-ink-700">Privacy Policy</a>
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-ink-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-accent hover:text-forest-700 transition-colors">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
