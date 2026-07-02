const nodemailer = require("nodemailer");

const templates = {
  // ─── Email Verification ─────────────────────────────────
  emailVerification: ({ name, verifyUrl }) => ({
    subject: "Verify your TutorLink email",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1B4332;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">TutorLink</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #EAEAE3;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#141410;margin-top:0">Verify your email</h2>
          <p style="color:#4A4A42">Hi <strong>${name}</strong>,</p>
          <p style="color:#4A4A42">Welcome to TutorLink! Please verify your email address to activate your account.</p>
          <a href="${verifyUrl}"
            style="display:inline-block;background:#1B4332;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0">
            Verify Email Address
          </a>
          <p style="color:#8C8C82;font-size:13px;margin-top:24px">
            This link expires in 24 hours. If you didn't create a TutorLink account, you can safely ignore this email.
          </p>
        </div>
        <p style="text-align:center;color:#8C8C82;font-size:12px;margin-top:16px">
          © ${new Date().getFullYear()} TutorLink. All rights reserved.
        </p>
      </div>
    `,
  }),

  // ─── Password Reset ─────────────────────────────────────
  passwordReset: ({ name, resetUrl }) => ({
    subject: "Reset your TutorLink password",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1B4332;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">TutorLink</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #EAEAE3;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#141410;margin-top:0">Reset your password</h2>
          <p style="color:#4A4A42">Hi <strong>${name}</strong>,</p>
          <p style="color:#4A4A42">You requested a password reset. Click the button below — this link expires in <strong>10 minutes</strong>.</p>
          <a href="${resetUrl}"
            style="display:inline-block;background:#1B4332;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:16px 0">
            Reset Password
          </a>
          <p style="color:#8C8C82;font-size:13px;margin-top:24px">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        <p style="text-align:center;color:#8C8C82;font-size:12px;margin-top:16px">
          © ${new Date().getFullYear()} TutorLink. All rights reserved.
        </p>
      </div>
    `,
  }),

  // ─── Booking Initiated (tutor heads-up, no action needed) ──
  // Replaces the old newBooking template
  // Sent when student creates a booking and is about to pay
  bookingInitiated: ({
    tutorName,
    studentName,
    subject,
    scheduledAt,
    duration,
  }) => ({
    subject: "A student is booking a session with you",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1B4332;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">TutorLink</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #EAEAE3;border-top:none;border-radius:0 0 12px 12px">
          <h2 style="color:#141410;margin-top:0">Incoming booking</h2>
          <p style="color:#4A4A42">Hi <strong>${tutorName}</strong>,</p>
          <p style="color:#4A4A42">
            <strong>${studentName}</strong> is booking a session with you and completing payment now.
            If payment succeeds you will receive a confirmation email with the meeting link.
            <strong>No action is needed from you at this stage.</strong>
          </p>
          <div style="background:#F4F4EF;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">Subject</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${subject}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">Student</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${studentName}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">Date & Time</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${scheduledAt}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">Duration</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${duration} minutes</td>
              </tr>
            </table>
          </div>
          <p style="color:#8C8C82;font-size:13px">
            You will receive another email once payment is confirmed with your video session link.
          </p>
        </div>
        <p style="text-align:center;color:#8C8C82;font-size:12px;margin-top:16px">
          © ${new Date().getFullYear()} TutorLink. All rights reserved.
        </p>
      </div>
    `,
  }),

  // ─── Session Confirmed ──────────────────────────────────
  // Sent to BOTH student and tutor after Stripe payment succeeds
  // role param controls what each person sees
  sessionConfirmed: ({
    name,
    otherPersonName,
    role,
    subject,
    sessionDate,
    duration,
    amount,
    meetingUrl,
  }) => ({
    subject:
      role === "student"
        ? "Your TutorLink session is confirmed ✅"
        : "New paid session booked ✅",
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#1B4332;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">TutorLink</h1>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #EAEAE3;border-top:none;border-radius:0 0 12px 12px">

          <h2 style="color:#141410;margin-top:0">
            ${role === "student" ? "Your session is confirmed!" : "You have a new paid session!"}
          </h2>

          <p style="color:#4A4A42">Hi <strong>${name}</strong>,</p>

          <p style="color:#4A4A42">
            ${
              role === "student"
                ? `Your payment was successful. Your <strong>${subject}</strong> session with <strong>${otherPersonName}</strong> is confirmed.`
                : `<strong>${otherPersonName}</strong> has paid and booked a <strong>${subject}</strong> session with you.`
            }
          </p>

          <!-- Session details -->
          <div style="background:#F4F4EF;border-radius:8px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">Subject</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${subject}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">${role === "student" ? "Tutor" : "Student"}</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${otherPersonName}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">Date & Time</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${sessionDate}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#6B6B61;font-size:14px">Duration</td>
                <td style="padding:6px 0;color:#141410;font-weight:600;font-size:14px;text-align:right">${duration} minutes</td>
              </tr>
              <tr style="border-top:1px solid #EAEAE3">
                <td style="padding:10px 0 6px;color:#6B6B61;font-size:14px">
                  Amount ${role === "student" ? "paid" : "earned"}
                </td>
                <td style="padding:10px 0 6px;color:#1B4332;font-weight:700;font-size:16px;text-align:right">
                  $${amount}
                </td>
              </tr>
            </table>
          </div>

          <!-- Join button -->
          <p style="color:#4A4A42;font-size:14px">
            Your video session link is ready below. It will be active 10 minutes before your session starts.
          </p>
          <a href="${meetingUrl}"
            style="display:inline-block;background:#1B4332;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0">
            Join Video Session
          </a>

          <p style="color:#8C8C82;font-size:13px;margin-top:24px">
            You can also find this link anytime in your
            <a href="${process.env.CLIENT_URL}/dashboard" style="color:#1B4332">TutorLink dashboard</a>.
          </p>

          <!-- Warning for tutor only -->
          ${
            role === "tutor"
              ? `
          <div style="background:#faf3d0;border:1px solid #eccf62;border-radius:8px;padding:16px;margin-top:20px">
            <p style="margin:0;color:#7f570d;font-size:14px">
              ⚠️ This session is already paid. If you need to cancel, please do so at least 24 hours 
              before the session starts to avoid a cancellation mark on your profile.
            </p>
          </div>
          `
              : ""
          }

        </div>
        <p style="text-align:center;color:#8C8C82;font-size:12px;margin-top:16px">
          © ${new Date().getFullYear()} TutorLink. All rights reserved.
        </p>
      </div>
    `,
  }),
};

// ─── Transporter ────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: Number(process.env.EMAIL_PORT) === 465, // true for port 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// ─── Send Email ─────────────────────────────────────────────
exports.sendEmail = async ({ to, subject, template, data }) => {
  // Skip silently in development if EMAIL_USER is not configured
  if (!process.env.EMAIL_USER) {
    console.log(
      `[Email skipped — EMAIL_USER not set] To: ${to} | Template: ${template}`,
    );
    return;
  }

  // Warn loudly if a template is called that doesn't exist
  if (!templates[template]) {
    console.error(`[Email error] Template "${template}" does not exist`);
    return;
  }

  const transporter = createTransporter();
  const { subject: templateSubject, html } = templates[template](data);

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "TutorLink <noreply@tutorlink.com>",
    to,
    subject: templateSubject || subject,
    html,
  });
};
