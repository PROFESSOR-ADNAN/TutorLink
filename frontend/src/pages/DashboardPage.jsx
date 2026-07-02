import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format, isAfter } from "date-fns";
import api from "../services/api";
import useAuthStore from "../context/authStore";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  pending: { label: "Pending", style: "badge-warning" },
  confirmed: { label: "Confirmed", style: "badge-forest" },
  completed: { label: "Completed", style: "badge-success" },
  cancelled: { label: "Cancelled", style: "badge-error" },
  no_show: { label: "No-show", style: "badge-neutral" },
};

function BookingRow({ booking, onUpdate }) {
  const { user } = useAuthStore();
  const isTutor = user?.role === "tutor";
  const other = isTutor ? booking.student : booking.tutor?.user;
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isPast = !isAfter(new Date(booking.scheduledAt), new Date());

  // Only allow joining starting 10 minutes before the scheduled time
  const canJoin =
    booking.status === "confirmed" &&
    booking.meetingUrl &&
    new Date() >=
      new Date(new Date(booking.scheduledAt).getTime() - 30 * 60 * 1000);

  const update = async (status) => {
    try {
      await api.patch(`/bookings/${booking._id}/status`, { status });
      toast.success(`Session ${status}`);
      onUpdate();
    } catch (err) {
      toast.error(err.message || "Failed to update");
    }
  };

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 rounded-xl transition-colors hover:bg-canvas-100"
      style={{ borderBottom: "1px solid #F4F4EF" }}
    >
      {/* Avatar + name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <img
          src={other?.avatar}
          alt={other?.name}
          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
        />
        <div className="min-w-0">
          <div className="font-sans font-semibold text-sm text-ink-900 truncate">
            {other?.name}
          </div>
          <div className="text-xs text-ink-400 truncate">{booking.subject}</div>
        </div>
      </div>

      {/* Date/time */}
      <div className="text-sm text-ink-600 flex-shrink-0">
        <div className="font-medium">
          {format(new Date(booking.scheduledAt), "MMM d, yyyy")}
        </div>
        <div className="text-xs text-ink-400">
          {format(new Date(booking.scheduledAt), "h:mm a")} · {booking.duration}
          min
        </div>
      </div>

      {/* Amount */}
      <div className="text-sm font-semibold text-ink-900 flex-shrink-0 font-sans">
        ${(booking.payment.amount / 100).toFixed(2)}
      </div>

      {/* Status badge */}
      <span className={`badge ${cfg.style} flex-shrink-0`}>{cfg.label}</span>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isTutor && booking.status === "pending" && (
          <button
            onClick={() => update("confirmed")}
            className="btn-primary btn-sm"
          >
            Confirm
          </button>
        )}
        {isTutor && booking.status === "confirmed" && !isPast && (
          <button
            onClick={() => update("completed")}
            className="btn-secondary btn-sm"
          >
            Complete
          </button>
        )}

        {booking.status === "confirmed" &&
          booking.meetingUrl &&
          (canJoin ? (
            <a
              href={booking.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm text-white"
              style={{ background: "#059669", borderRadius: "0.5rem" }}
            >
              Join →
            </a>
          ) : (
            <span
              className="btn-sm text-ink-400"
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "0.5rem",
                background: "#F4F4EF",
                cursor: "not-allowed",
              }}
              title="Link opens 10 minutes before your session"
            >
              Opens soon
            </span>
          ))}

        {["pending", "confirmed"].includes(booking.status) && (
          <button
            onClick={() => update("cancelled")}
            className="btn-sm font-medium transition-colors"
            style={{
              color: "#dc2626",
              padding: "0.375rem 0.75rem",
              borderRadius: "0.5rem",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  const fetchBookings = async () => {
    try {
      const data = await api.get("/bookings?limit=50");
      setBookings(data.bookings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const now = new Date();
  const filtered = bookings.filter((b) => {
    const upcoming =
      ["pending", "confirmed"].includes(b.status) &&
      isAfter(new Date(b.scheduledAt), now);
    const past =
      ["completed", "cancelled", "no_show"].includes(b.status) ||
      !isAfter(new Date(b.scheduledAt), now);
    if (tab === "upcoming") return upcoming;
    if (tab === "past") return past;
    return true;
  });

  const stats = {
    completed: bookings.filter((b) => b.status === "completed").length,
    upcoming: bookings.filter(
      (b) =>
        ["pending", "confirmed"].includes(b.status) &&
        isAfter(new Date(b.scheduledAt), now),
    ).length,
    pending: bookings.filter((b) => b.status === "pending").length,
  };

  return (
    <div className="min-h-screen" style={{ background: "#FAFAF7" }}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #EAEAE3" }}>
        <div className="section py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p
                className="text-xs font-sans font-semibold uppercase tracking-widest mb-1"
                style={{ color: "#D4A017" }}
              >
                {user?.role}
              </p>
              <h1
                className="font-serif text-ink-900"
                style={{ fontSize: "1.75rem" }}
              >
                Good to see you, {user?.name?.split(" ")[0]}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {user?.role === "student" && (
                <Link to="/tutors" className="btn-primary btn-sm">
                  Find a tutor
                </Link>
              )}
              <Link to="/chat" className="btn-outline btn-sm">
                Messages
              </Link>
              <Link to="/profile" className="btn-ghost btn-sm">
                Settings
              </Link>
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-3 mt-6">
            {[
              { label: "Completed sessions", value: stats.completed },
              { label: "Upcoming", value: stats.upcoming },
              { label: "Awaiting confirm", value: stats.pending },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-4 py-2 rounded-xl"
                style={{ background: "#F4F4EF", border: "1px solid #EAEAE3" }}
              >
                <span className="font-serif text-xl text-forest-800">
                  {value}
                </span>
                <span className="text-xs text-ink-500 font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings table */}
      <div className="section py-8">
        <div className="card">
          {/* Tabs */}
          <div className="px-6 pt-5 flex items-center gap-0 border-b border-canvas-200">
            {[
              ["upcoming", "Upcoming"],
              ["past", "Past"],
              ["all", "All"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="pb-4 px-4 text-sm font-medium border-b-2 transition-all -mb-px"
                style={
                  tab === key
                    ? { borderColor: "#1B4332", color: "#1B4332" }
                    : { borderColor: "transparent", color: "#6B6B61" }
                }
              >
                {label}
                {key === "upcoming" && stats.upcoming > 0 && (
                  <span
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-xs"
                    style={{ background: "#1B4332", fontSize: "10px" }}
                  >
                    {stats.upcoming}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-2">
            {loading ? (
              <div className="space-y-2 p-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-canvas-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "#F4F4EF" }}
                >
                  <svg
                    className="w-7 h-7 text-ink-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="font-sans font-medium text-ink-900 mb-1 text-sm">
                  No sessions here yet
                </p>
                <p className="text-xs text-ink-400 mb-4">
                  {tab === "upcoming" && user?.role === "student"
                    ? "Find a tutor to book your first session"
                    : "Sessions will appear here once scheduled"}
                </p>
                {user?.role === "student" && tab === "upcoming" && (
                  <Link to="/tutors" className="btn-primary btn-sm">
                    Browse tutors
                  </Link>
                )}
              </div>
            ) : (
              <div>
                {filtered.map((b) => (
                  <BookingRow
                    key={b._id}
                    booking={b}
                    onUpdate={fetchBookings}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Become a tutor card (for students)
        {user?.role === "student" && (
          <div
            className="mt-4 card p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            style={{ background: "linear-gradient(135deg, #1B4332, #2d6652)" }}
          >
            <div>
              <h3 className="font-serif text-white text-lg mb-1">
                Are you an expert in your field?
              </h3>
              <p
                className="text-sm"
                style={{ color: "rgb(255 255 255 / 0.65)" }}
              >
                Share your knowledge and earn. Join our tutor community.
              </p>
            </div>
            <Link to="/become-tutor" className="btn-gold btn-sm flex-shrink-0">
              Apply to tutor →
            </Link>
          </div>
        )} */}
      </div>
    </div>
  );
}
