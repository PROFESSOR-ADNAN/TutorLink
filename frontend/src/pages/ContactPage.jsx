import { useState } from 'react';

const SUPPORT_EMAIL = 'support@tutorlink.com';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${form.name || 'TutorLink user'}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-3xl text-ink-900 mb-3">Contact us</h1>
      <p className="text-ink-600 mb-10">
        Questions, feedback, or an issue with a booking? Fill this out and it'll open in your email app addressed to our
        support team, or write to us directly at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-forest-800 font-medium hover:underline">
          {SUPPORT_EMAIL}
        </a>.
      </p>

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-5">
        <div>
          <label className="label">Name</label>
          <input
            type="text" required className="input" placeholder="Your name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email" required className="input" placeholder="you@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea
            required rows={5} className="input resize-none" placeholder="How can we help?"
            value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary w-full py-3">
          Send message
        </button>
      </form>
    </div>
  );
}
