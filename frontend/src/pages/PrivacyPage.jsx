export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-3xl text-ink-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-ink-400 mb-10">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-sm max-w-none space-y-8 text-ink-700">
        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">1. Information we collect</h2>
          <p>When you create an account, we collect your name, email address, and password (stored encrypted, never in plain text). If you become a tutor, we additionally collect the subjects you teach, your hourly rate, education level, and bio. Booking a session shares your chosen time slot and payment details with our payment processor, Stripe — we never see or store your full card number.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">2. How we use your information</h2>
          <p>We use your information to operate the core service: matching students with tutors, processing bookings and payments, enabling messaging between matched users, and sending you account and booking-related notifications. We do not sell your personal information to third parties.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">3. Messaging</h2>
          <p>Messages you send through our chat feature are stored so that conversation history is available to both participants. Only the sender and recipient of a message can read it.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">4. Cookies</h2>
          <p>We use a single, strictly necessary session cookie to keep you signed in. It's set to HTTP-only, meaning it can't be read by JavaScript, and is not used for advertising or cross-site tracking.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">5. Data retention and deletion</h2>
          <p>We retain your account data for as long as your account is active. You can request deletion of your account and associated data at any time by contacting <a href="mailto:support@tutorlink.com" className="text-forest-800 hover:underline">support@tutorlink.com</a>.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">6. Your rights</h2>
          <p>Depending on your location, you may have the right to access, correct, or delete your personal data, and to object to certain processing. To exercise any of these rights, reach out to us at the email above.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">7. Changes to this policy</h2>
          <p>We may update this policy from time to time. Material changes will be reflected by updating the date at the top of this page.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">8. Contact</h2>
          <p>Questions about this policy? Reach us at <a href="mailto:support@tutorlink.com" className="text-forest-800 hover:underline">support@tutorlink.com</a> or via our <a href="/contact" className="text-forest-800 hover:underline">contact page</a>.</p>
        </section>
      </div>
    </div>
  );
}
