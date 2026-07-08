import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import useAuthStore from "../context/authStore";
import Avatar from "../components/ui/Avatar";

const SUBJECTS = [
  { name: "Mathematics", icon: "∑" },
  { name: "Programming", icon: "</>" },
  { name: "Physics", icon: "⚛" },
  { name: "English", icon: "Aa" },
  { name: "Chemistry", icon: "⚗" },
  { name: "Biology", icon: "🧬" },
  { name: "History", icon: "📜" },
  { name: "Spanish", icon: "Es" },
];

const STATS = [
  { value: "50+", label: "Verified tutors" },
  { value: `${SUBJECTS.length}+`, label: "Subjects" },
  { value: "20+", label: "Sessions completed" },
];

function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? "star-filled" : "star-empty"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// Floating tutor cards — the signature element of the hero
function TutorCardStack({ tutors, loading }) {
  if (!loading && tutors.length === 0) return null;

  return (
    <div className="relative w-full max-w-xs mx-auto lg:mx-0 h-80 hidden md:block">
      {loading
        ? [0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute card p-4 w-64 animate-pulse"
              style={{ top: `${i * 72}px`, left: `${i * 16}px`, zIndex: 3 - i }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-canvas-300 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-canvas-300 rounded w-3/4" />
                  <div className="h-2 bg-canvas-300 rounded w-1/2" />
                </div>
              </div>
              <div className="h-2 bg-canvas-300 rounded w-full" />
            </div>
          ))
        : tutors.map((t, i) => (
            <div
              key={t._id}
              className="absolute card p-4 w-64"
              style={{
                top: `${i * 72}px`,
                left: `${i * 16}px`,
                zIndex: 3 - i,
                boxShadow:
                  i === 0
                    ? "0 16px 40px rgb(0 0 0 / 0.12), 0 4px 12px rgb(0 0 0 / 0.06)"
                    : "0 4px 12px rgb(0 0 0 / 0.06)",
                opacity: i === 0 ? 1 : i === 1 ? 0.92 : 0.82,
                transform: `rotate(${i === 1 ? "1.5deg" : i === 2 ? "3deg" : "0deg"})`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={t.user?.avatar} name={t.user?.name} size="md" />
                <div className="min-w-0">
                  <div className="font-sans font-semibold text-ink-900 text-sm leading-tight truncate">
                    {t.user?.name}
                  </div>
                  <div className="text-xs text-ink-400 mt-0.5 truncate">
                    {t.subjects?.[0]}
                    {t.educationLevel ? ` · ${t.educationLevel}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Stars rating={t.averageRating || 0} />
                  <span className="text-xs font-medium text-ink-600">
                    {t.averageRating > 0 ? t.averageRating.toFixed(1) : "New"}
                  </span>
                </div>
                <div className="text-xs text-ink-400">
                  {t.totalSessions || 0} sessions
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-canvas-200 flex items-center justify-between">
                <span className="text-xs text-ink-400">From</span>
                <span className="font-sans font-semibold text-ink-900 text-sm">
                  ${t.hourlyRate}
                  <span className="font-normal text-ink-400">/hr</span>
                </span>
              </div>
            </div>
          ))}

      {/* Live badge floating above */}
      <div
        className="absolute -top-4 -right-2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white"
        style={{
          background: "#1B4332",
          boxShadow: "0 4px 12px rgb(27 67 50 / 0.35)",
        }}
      >
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        Available now
      </div>
    </div>
  );
}

export default function HomePage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [featuredTutors, setFeaturedTutors] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    api
      .get("/tutors?sort=-averageRating&limit=3")
      .then((data) => setFeaturedTutors(data.tutors || []))
      .catch(() => {}) // homepage still works fine without featured tutors
      .finally(() => setLoadingFeatured(false));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(
      `/tutors${search ? `?subject=${encodeURIComponent(search)}` : ""}`,
    );
  };

  return (
    <div className="bg-canvas-100">
      {/* ─── Hero ──────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "#FAFAF7" }}
      >
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-canvas opacity-60 pointer-events-none" />

        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background:
              "linear-gradient(90deg, transparent, #1B4332 30%, #D4A017 60%, transparent)",
          }}
        />

        <div className="section relative pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 lg:gap-8">
            {/* Left: headline + search */}
            <div className="flex-1 max-w-xl animate-fade-up">
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-6">
                <div className="h-px w-8" style={{ background: "#D4A017" }} />
                <span
                  className="text-xs font-sans font-semibold uppercase tracking-widest"
                  style={{ color: "#7f570d" }}
                >
                  Expert tutoring, on demand
                </span>
              </div>

              <h1
                className="font-serif mb-6"
                style={{
                  fontSize: "clamp(2.5rem, 5vw, 4rem)",
                  lineHeight: 1.06,
                  letterSpacing: "-0.025em",
                  color: "#141410",
                }}
              >
                Learn from{" "}
                <span className="italic" style={{ color: "#1B4332" }}>
                  experts
                </span>{" "}
                who've been where you're going
              </h1>

              <p
                className="font-sans text-base mb-10 leading-relaxed"
                style={{ color: "#6B6B61", maxWidth: "38ch" }}
              >
                Book live 1-on-1 sessions with verified tutors. Pick your
                subject, pick your time — start learning today.
              </p>

              {/* Search bar */}
              <form
                onSubmit={handleSearch}
                className="flex items-stretch rounded-xl overflow-hidden mb-6"
                style={{
                  border: "1.5px solid #EAEAE3",
                  background: "#fff",
                  boxShadow: "0 4px 16px rgb(0 0 0 / 0.06)",
                }}
              >
                <div className="flex items-center px-4 gap-3 flex-1">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "#8C8C82" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Subject, topic, or keyword…"
                    className="flex-1 py-3.5 bg-transparent text-sm text-ink-900 placeholder-ink-400 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="btn-primary rounded-none rounded-r-xl px-6 text-sm m-1 rounded-lg"
                >
                  Search tutors
                </button>
              </form>

              {/* Subject pills */}
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map(({ name, icon }) => (
                  <button
                    key={name}
                    onClick={() => navigate(`/tutors?subject=${name}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{
                      background: "#F4F4EF",
                      color: "#4A4A42",
                      border: "1px solid #EAEAE3",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#1B4332";
                      e.currentTarget.style.color = "#1B4332";
                      e.currentTarget.style.background = "#f0f7f4";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#EAEAE3";
                      e.currentTarget.style.color = "#4A4A42";
                      e.currentTarget.style.background = "#F4F4EF";
                    }}
                  >
                    <span
                      className="font-mono text-xs"
                      style={{ color: "#D4A017" }}
                    >
                      {icon}
                    </span>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: tutor card stack */}
            <div className="flex-shrink-0 animate-fade-in animate-delay-200">
              <TutorCardStack
                tutors={featuredTutors}
                loading={loadingFeatured}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats bar ─────────────────────────────────────── */}
      <section style={{ background: "#1B4332" }}>
        <div className="section py-8">
          <div
            className="grid grid-cols-3 gap-6 md:gap-0 md:divide-x max-w-lg mx-auto md:max-w-none"
            style={{
              "--tw-divide-opacity": 1,
              borderColor: "rgb(255 255 255 / 0.1)",
            }}
          >
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center md:px-8">
                <div
                  className="font-serif text-3xl text-white mb-1"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  {value}
                </div>
                <div
                  className="font-sans text-xs font-medium uppercase tracking-wider"
                  style={{ color: "rgb(255 255 255 / 0.55)" }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────── */}
      <section className="section py-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-14">
          <div>
            <p
              className="text-xs font-sans font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#D4A017" }}
            >
              The process
            </p>
            <h2
              className="font-serif"
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                color: "#141410",
              }}
            >
              Three steps to your
              <br className="hidden sm:block" /> first session
            </h2>
          </div>
          <Link
            to="/tutors"
            className="btn-outline btn-sm self-start md:self-auto flex-shrink-0"
          >
            Browse all tutors →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              n: "01",
              title: "Find your tutor",
              body: "Search by subject, filter by price and rating. Every tutor on TutorLink is verified and background-checked.",
              cta: "Browse tutors",
              href: "/tutors",
            },
            {
              n: "02",
              title: "Book a time slot",
              body: "Choose from available slots that fit your schedule. Sessions from 30 minutes to 2 hours.",
              cta: null,
            },
            {
              n: "03",
              title: "Learn live, one-on-one",
              body: "Join your session via video call with screen sharing and real-time chat. No commute, no classroom.",
              cta: null,
            },
          ].map(({ n, title, body, cta, href }) => (
            <div key={n} className="card-hover p-8 group">
              <div
                className="font-serif text-5xl mb-6 leading-none"
                style={{ color: "#EAEAE3" }}
              >
                {n}
              </div>
              <h3 className="font-sans font-semibold text-ink-900 text-base mb-3 group-hover:text-forest-800 transition-colors">
                {title}
              </h3>
              <p
                className="font-sans text-sm leading-relaxed mb-4"
                style={{ color: "#6B6B61" }}
              >
                {body}
              </p>
              {cta && href && (
                <Link
                  to={href}
                  className="text-sm font-medium transition-colors"
                  style={{ color: "#1B4332" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#D4A017")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#1B4332")
                  }
                >
                  {cta} →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Subjects grid ─────────────────────────────────── */}
      <section
        style={{
          background: "#F4F4EF",
          borderTop: "1px solid #EAEAE3",
          borderBottom: "1px solid #EAEAE3",
        }}
      >
        <div className="section py-20">
          <p
            className="text-xs font-sans font-semibold uppercase tracking-widest mb-3 text-center"
            style={{ color: "#D4A017" }}
          >
            Subjects
          </p>
          <h2
            className="font-serif text-center mb-12"
            style={{
              fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)",
              color: "#141410",
            }}
          >
            Whatever you're learning, we've got a tutor
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SUBJECTS.map(({ name, icon }) => (
              <button
                key={name}
                onClick={() => navigate(`/tutors?subject=${name}`)}
                className="flex items-center gap-3 p-4 rounded-xl text-left group transition-all duration-150"
                style={{ background: "#fff", border: "1px solid #EAEAE3" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#1B4332";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgb(27 67 50 / 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#EAEAE3";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm font-bold flex-shrink-0"
                  style={{ background: "#f0f7f4", color: "#1B4332" }}
                >
                  {icon}
                </span>
                <span className="font-sans font-medium text-sm text-ink-800 group-hover:text-forest-800 transition-colors">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────── */}
      {!isAuthenticated && (
        <section className="section py-24">
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{ background: "#1B4332" }}
          >
            {/* Subtle texture */}
            <div className="absolute inset-0 bg-grid-canvas opacity-5 pointer-events-none" />
            <div className="relative px-8 py-16 md:px-16 md:py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
              <div className="max-w-lg">
                <p
                  className="text-xs font-sans font-semibold uppercase tracking-widest mb-4"
                  style={{ color: "#D4A017" }}
                >
                  Get started today
                </p>
                <h2
                  className="font-serif text-white mb-4"
                  style={{
                    fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
                    lineHeight: 1.1,
                  }}
                >
                  Your first session is one click away
                </h2>
                <p
                  className="font-sans text-sm leading-relaxed"
                  style={{ color: "rgb(255 255 255 / 0.65)" }}
                >
                  Join thousands of students who've already found their tutor on
                  TutorLink. Free to sign up, no subscription required.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
                <Link
                  to="/register"
                  className="btn-gold btn-lg whitespace-nowrap"
                >
                  Create free account
                </Link>
                <Link
                  to="/tutors"
                  className="btn btn-lg whitespace-nowrap"
                  style={{
                    border: "1px solid rgb(255 255 255 / 0.2)",
                    color: "white",
                    borderRadius: "0.625rem",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgb(255 255 255 / 0.08)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  Browse tutors
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
