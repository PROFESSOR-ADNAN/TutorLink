export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-serif text-3xl text-ink-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-ink-400 mb-10">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="prose prose-sm max-w-none space-y-8 text-ink-700">
        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">1. Acceptance of terms</h2>
          <p>By creating an account or using TutorLink, you agree to these Terms of Service. If you don't agree, please don't use the platform.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">2. Accounts</h2>
          <p>When you register, you choose whether to join as a student or a tutor. This choice determines your role on the platform going forward. You're responsible for keeping your login credentials secure and for all activity under your account.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">3. Bookings and payments</h2>
          <p>Students book paid sessions with tutors through the platform. Payments are processed securely by Stripe. Cancellation and refund terms are shown at the time of booking. TutorLink is a marketplace connecting students and tutors — it is not a party to the tutoring arrangement itself.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">4. Tutor conduct</h2>
          <p>Tutors are expected to accurately represent their qualifications and to conduct sessions professionally. TutorLink reserves the right to remove tutor profiles that violate this or receive substantiated complaints.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">5. Prohibited use</h2>
          <p>You agree not to use the platform to harass other users, share content unrelated to tutoring, attempt to circumvent platform payments, or misuse the messaging system.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">6. Termination</h2>
          <p>We may suspend or terminate accounts that violate these terms. You may close your account at any time by contacting support.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">7. Disclaimer</h2>
          <p>TutorLink is provided "as is" without warranties of any kind. We do our best to verify tutor qualifications but cannot guarantee outcomes from any tutoring session.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">8. Changes to these terms</h2>
          <p>We may update these terms occasionally. Continued use of TutorLink after changes take effect constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="font-serif text-xl text-ink-900 mb-2">9. Contact</h2>
          <p>Questions about these terms? Reach us at <a href="mailto:support@tutorlink.com" className="text-accent hover:underline">support@tutorlink.com</a> or via our <a href="/contact" className="text-accent hover:underline">contact page</a>.</p>
        </section>
      </div>
    </div>
  );
}
