# TutorLink

[![CI](https://github.com/PROFESSOR-ADNAN/TutorLink/actions/workflows/ci.yml/badge.svg)](https://github.com/PROFESSOR-ADNAN/TutorLink/actions)
[![Node](https://img.shields.io/badge/Node-20-green?logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://react.dev)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-green?logo=mongodb)](https://mongodb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An online tutoring platform connecting students with verified expert tutors for live 1-on-1 sessions — with real-time chat, session booking, and integrated payments.

```
POST /api/bookings
{ "tutorId": "...", "subject": "Mathematics", "scheduledAt": "2026-06-20T10:00:00Z", "duration": 60 }

→ { "booking": { "_id": "...", "status": "pending", "payment": { "amount": 3000 } } }
```

> **Status:** Active development — core platform (auth, booking, real-time chat, payments) fully implemented. Video calling and admin dashboard planned next.

---

## Why This Exists

Finding a reliable tutor is hard. Existing platforms are expensive, opaque, or require long sign-up processes. TutorLink is built to be fast, transparent, and student-first — from a clean search experience to a one-click booking flow with integrated Stripe payments.

---

## Feature Overview

| Feature | Description |
|---|---|
| 🔐 Auth | JWT + HTTP-only cookies, email verification, password reset |
| 🔍 Tutor Search | Filter by subject, rating, price, language, availability |
| 📅 Booking | Pick a time slot, pay via Stripe, auto-confirm on payment |
| 💬 Real-time Chat | Socket.IO with typing indicators, read receipts, message history |
| ⭐ Reviews | Students review tutors after completed sessions, auto-updates rating |
| 💳 Payments | Stripe Payment Intents, webhook-driven confirmation |
| 🛡️ Security | Helmet, rate limiting, NoSQL injection sanitization, CORS |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand |
| **Backend** | Node.js 20, Express 4, Socket.IO |
| **Database** | MongoDB 7 with Mongoose |
| **Auth** | JWT (jsonwebtoken), bcryptjs, HTTP-only cookies |
| **Payments** | Stripe Payment Intents + Webhooks |
| **Real-time** | Socket.IO (chat + typing indicators) |
| **File Uploads** | Cloudinary |
| **Email** | Nodemailer (SMTP) |
| **Containerization** | Docker + Docker Compose |
| **CI** | GitHub Actions |

---

## Project Structure

```
tutorlink/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js              # MongoDB connection
│   │   │   └── socket.js          # Socket.IO init + auth middleware
│   │   ├── controllers/
│   │   │   ├── auth.controller.js    # Register, login, password reset
│   │   │   ├── tutor.controller.js   # Tutor profiles + search
│   │   │   ├── booking.controller.js # Session CRUD
│   │   │   ├── chat.controller.js    # Message history
│   │   │   └── payment.controller.js # Stripe intents + webhooks
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js    # protect() + restrictTo()
│   │   │   └── error.middleware.js   # Global error handler
│   │   ├── models/
│   │   │   ├── User.model.js      # Roles, hashed passwords, tokens
│   │   │   ├── Tutor.model.js     # Profile, subjects, availability
│   │   │   ├── Booking.model.js   # Sessions + payment status
│   │   │   ├── Review.model.js    # Auto-recalculates tutor rating
│   │   │   └── Message.model.js   # Chat history
│   │   ├── routes/                # One file per resource
│   │   ├── utils/
│   │   │   └── email.js           # Nodemailer + HTML templates
│   │   ├── app.js                 # Express app + all middleware
│   │   └── server.js              # HTTP server + Socket.IO attach
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── assets/styles/
│   │   │   └── index.css          # Tailwind + custom component classes
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── Navbar.jsx
│   │   │       └── Footer.jsx
│   │   ├── context/
│   │   │   ├── authStore.js       # Zustand global auth state
│   │   │   └── SocketContext.jsx  # Socket.IO React context
│   │   ├── pages/
│   │   │   ├── HomePage.jsx       # Hero, search, how it works
│   │   │   ├── TutorsPage.jsx     # Filterable browse grid
│   │   │   ├── TutorProfilePage.jsx
│   │   │   ├── BookingPage.jsx    # 2-step: slot picker → Stripe
│   │   │   ├── DashboardPage.jsx  # Sessions for students & tutors
│   │   │   ├── ChatPage.jsx       # Real-time messaging
│   │   │   ├── ProfilePage.jsx    # Edit personal info + password
│   │   │   ├── BecomeTutorPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   └── api.js             # Axios instance + interceptors
│   │   ├── App.jsx                # Routes + PrivateRoute guard
│   │   └── main.jsx
│   ├── nginx.conf                 # SPA fallback config
│   ├── vercel.json                # Vercel SPA rewrite rules
│   ├── Dockerfile
│   └── .env.example
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # Lint + build check on every push
├── docker-compose.yml
└── .gitignore
```

---

## Getting Started (Local)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommended — runs everything with one command)
- Or: Node.js 20+, MongoDB 7

### 1. Clone and configure

```bash
git clone https://github.com/PROFESSOR-ADNAN/TutorLink.git
cd TutorLink

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` and fill in at minimum:

```env
MONGO_URI=mongodb://root:rootpassword@mongo:27017/tutorlink?authSource=admin
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
STRIPE_SECRET_KEY=sk_test_...        # from dashboard.stripe.com
STRIPE_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=http://localhost:3000
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

### 2. Start everything

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

> **Without Docker:** run `npm install && npm run dev` in both `backend/` and `frontend/` separately. Make sure MongoDB is running locally.

### 3. Test the API

```bash
# Register a student
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"student@test.com","password":"password123","role":"student"}'

# Browse tutors
curl http://localhost:5000/api/tutors?subject=Mathematics
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Get JWT token |
| POST | `/api/auth/logout` | — | Clear cookie |
| GET | `/api/auth/me` | ✅ | Current user |
| POST | `/api/auth/forgot-password` | — | Send reset email |
| PATCH | `/api/auth/reset-password/:token` | — | Set new password |
| PATCH | `/api/auth/update-password` | ✅ | Change password |

### Tutors

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tutors` | — | Search/filter tutors |
| GET | `/api/tutors/:id` | — | Single tutor profile |
| POST | `/api/tutors` | ✅ | Create tutor profile |
| PATCH | `/api/tutors/me` | ✅ Tutor | Update my profile |

**Search params:** `subject`, `minRate`, `maxRate`, `minRating`, `language`, `sort`, `page`, `limit`

### Bookings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/bookings` | ✅ | My bookings (student or tutor) |
| POST | `/api/bookings` | ✅ Student | Create booking |
| PATCH | `/api/bookings/:id/status` | ✅ | Update status |

### Chat

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/chat/conversations` | ✅ | All my conversations |
| GET | `/api/chat/:userId` | ✅ | Message history with user |
| POST | `/api/chat` | ✅ | Send message (REST fallback) |

### Payments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/payments/create-payment-intent/:bookingId` | ✅ | Get Stripe client secret |
| POST | `/api/payments/webhook` | Stripe sig | Stripe payment events |

---

## Security Decisions

| Concern | Solution |
|---|---|
| Password storage | `bcryptjs` with cost factor 12 — brute-force resistant |
| Auth tokens | HTTP-only cookies (not localStorage) — prevents XSS theft |
| Password reset tokens | SHA-256 hashed before storing — DB breach can't be used directly |
| CSRF | `SameSite: strict` cookie flag |
| XSS headers | `helmet()` sets Content-Security-Policy and other headers |
| NoSQL injection | `express-mongo-sanitize` strips `$` from request bodies |
| Brute force | Rate limiting: 100 req/15min globally, 20 req/hour on `/auth` |
| Payload attacks | `express.json({ limit: '10kb' })` |
| Admin role | Cannot be self-assigned via API — protected in register controller |

---

## Deployment on Vercel

> Vercel is a hosting platform built for frontend frameworks and serverless functions. It's **free** for personal projects, deploys from GitHub automatically, and gives you a live URL in ~60 seconds.

### How Vercel works (plain English)

When you push code to GitHub, Vercel:
1. Detects it's a React/Vite project
2. Runs `npm run build` — this creates a `dist/` folder of static HTML/JS/CSS
3. Uploads those files to a global CDN (servers in 100+ cities)
4. Points your domain at the CDN

Your users get the files from the server nearest to them → fast loads worldwide.

**Important:** Vercel only hosts the **frontend**. The backend (Express + Socket.IO) needs a separate host like [Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io) — all have free tiers.

---

### Step 1 — Deploy the Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select **TutorLink**, then pick the `backend/` directory
3. Railway detects Node.js and runs `npm start` automatically
4. Go to **Variables** and add every key from `backend/.env.example`
5. For `MONGO_URI`: click **New → Database → MongoDB** — Railway creates one and gives you the URI
6. Click **Generate Domain** — you get a URL like `https://tutorlink-api.up.railway.app`

---

### Step 2 — Deploy the Frontend to Vercel

#### Option A — Vercel Dashboard (easiest)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your **TutorLink** GitHub repository
3. Set **Root Directory** to `frontend`
4. Vercel auto-detects Vite. Confirm build settings:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Under **Environment Variables**, add:
   ```
   VITE_API_URL        = https://tutorlink-api.up.railway.app/api
   VITE_STRIPE_PUBLIC_KEY = pk_live_...
   ```
6. Click **Deploy** — done. You get a URL like `https://tutorlink.vercel.app`

#### Option B — Vercel CLI

```bash
npm install -g vercel

cd frontend
vercel

# Follow the prompts:
# ? Set up and deploy? Yes
# ? Which scope? (your account)
# ? Link to existing project? No
# ? Project name: tutorlink
# ? In which directory is your code? ./
# ? Want to override settings? No

# Set env variables:
vercel env add VITE_API_URL
vercel env add VITE_STRIPE_PUBLIC_KEY

# Deploy to production:
vercel --prod
```

---

### Step 3 — Update CORS on the backend

After you have your Vercel URL, go back to Railway and update:

```env
CLIENT_URL=https://tutorlink.vercel.app
```

This tells the backend to accept requests from your live frontend.

---

### Step 4 — Set up Stripe Webhook for production

1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click **Add endpoint**
3. URL: `https://tutorlink-api.up.railway.app/api/payments/webhook`
4. Events to listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy the **Signing Secret** → add it to Railway as `STRIPE_WEBHOOK_SECRET`

---

### Automatic deploys

After the initial setup, every `git push` to `main`:
- Vercel automatically rebuilds and redeploys the frontend
- Railway automatically rebuilds and redeploys the backend

No manual steps needed. Pull request previews also get their own URLs.

---

## Roadmap

- [x] Phase 1 — Auth (register, login, JWT, email verify, password reset)
- [x] Phase 2 — Tutor profiles with search and filtering
- [x] Phase 3 — Booking system with Stripe payments
- [x] Phase 4 — Real-time chat with Socket.IO
- [x] Phase 5 — Reviews with auto-calculated ratings
- [ ] Phase 6 — Video sessions (Daily.co or Jitsi integration)
- [ ] Phase 7 — Admin dashboard (approve tutors, view stats)
- [ ] Phase 8 — Mobile app (React Native)

---

## Contributing

```bash
# Install and run locally
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev

# Run backend tests
cd backend && npm test
```

Code style: ESLint enforced. Please open an issue before submitting large PRs.

---

## License

MIT
