import { Link } from 'react-router-dom';

const REQUIREMENTS = [
  {
    title: 'A complete profile',
    detail: 'Your subjects, hourly rate, education level, and weekly availability must all be filled in. An incomplete profile cannot be reviewed.',
  },
  {
    title: 'A valid national ID',
    detail: 'A clear photo or scan of a government-issued ID. This is required for every applicant and is used only to confirm your identity — it is never shown publicly.',
  },
  {
    title: 'Proof of education (recommended)',
    detail: 'A degree, diploma, or transcript relevant to the subjects you want to teach. Not required for every subject, but strongly recommended and considered during review.',
  },
  {
    title: 'Teaching certificates (if applicable)',
    detail: 'Any formal teaching or subject-matter certification you hold. Optional, but it helps your application and your visibility to students.',
  },
  {
    title: 'A working payout method',
    detail: 'Once approved, you\'ll add your bank account details so we can pay you after each completed session.',
  },
];

export default function BecomeTutorGuidePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-3xl text-ink-900 mb-2">Becoming a tutor on TutorLink</h1>
      <p className="text-ink-600 mb-10">
        What we ask for, how review works, and what to expect — read this before you apply so there's no
        surprise later.
      </p>

      <div className="space-y-4 mb-10">
        {REQUIREMENTS.map((r) => (
          <div key={r.title} className="card p-5">
            <h3 className="font-sans font-semibold text-ink-900 text-sm mb-1">{r.title}</h3>
            <p className="text-sm text-ink-600">{r.detail}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-sm max-w-none space-y-8 text-ink-700">
        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">How review works</h2>
          <p>
            After you submit your profile and documents, an admin reviews your application — typically
            within a few business days. You'll be notified by email either way. If your application isn't
            approved, we'll tell you specifically what needs to change, and you're welcome to update your
            profile and resubmit at any time; nothing you've uploaded is deleted in the meantime.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">Approval isn't guaranteed</h2>
          <p>
            Meeting the requirements above is necessary but doesn't guarantee approval. TutorLink reserves
            the right to approve, reject, suspend, or remove any tutor account at its discretion, including
            after approval, if we determine the platform's standards for safety, conduct, or quality aren't
            being met.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">Payments and commission</h2>
          <p>
            Students pay through TutorLink at the time of booking. TutorLink retains a commission from each
            session, and the remainder is transferred to your registered bank account after the session is
            marked complete. Current commission rates are shown in your dashboard and may be updated with
            notice.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">Conduct expected of tutors</h2>
          <p>
            Tutors are expected to represent their qualifications accurately, conduct sessions
            professionally, and communicate respectfully with students at all times. Violations may result
            in suspension or removal, independent of any prior approval.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">Cancelling a confirmed session</h2>
          <p>
            Once a student has paid, a tutor cannot cancel the session directly through the platform. If
            you're genuinely unable to attend, you can file a cancellation request explaining why — an
            admin reviews it and, if approved, the student is refunded in full. This exists to protect
            students who've already committed their time and payment.
          </p>
        </section>

        <section>
          <p className="text-xs text-ink-400">
            This page is a plain-language summary of our expectations for tutors and is not a substitute
            for TutorLink's full <Link to="/terms" className="text-accent hover:underline">Terms of Service</Link>{' '}
            and <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>, which
            govern your use of the platform. If anything here conflicts with those documents, the Terms of
            Service control.
          </p>
        </section>
      </div>

      <div className="mt-10 text-center">
        <Link to="/register" className="btn-primary px-8 py-3">Apply to become a tutor</Link>
      </div>
    </div>
  );
}
