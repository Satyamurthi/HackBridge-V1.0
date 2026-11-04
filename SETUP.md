# HackBridge Full-Stack Setup Guide (Frontend & Backend)

Welcome to **HackBridge**, an institutional-grade, full-stack competition platform engineered to manage high-stakes university hackathons, atomic problem allocations, cryptographic team credentials, GitHub auto-sync, and multi-judge evaluations.

This guide provides complete, step-by-step instructions to set up, configure, run, and test both the **Frontend** and **Backend** of HackBridge.

---

## 1. System Requirements & Prerequisites

Ensure the following prerequisites are installed on your host machine:

| Requirement | Recommended Version | Verification Command |
| :--- | :--- | :--- |
| **Node.js** | `v20.x` or higher (LTS recommended) | `node -v` |
| **npm** | `v10.x` or higher | `npm -v` |
| **Git** | `v2.30+` | `git --version` |
| **Database** | SQLite (default, zero-setup) or PostgreSQL 14+ | `sqlite3 --version` |
| **Operating System** | Linux, macOS, or Windows (WSL2 recommended) | `uname -a` |

> **Linux / NVM Tip**: If Node.js is managed via NVM, ensure your shell has the binary in its `$PATH`:
> ```bash
> export PATH="/home/$(whoami)/.nvm/versions/node/$(nvm current)/bin:$PATH"
> ```

---

## 2. Quickstart (Get Up and Running in 5 Minutes)

Run the following commands in sequence to initialize and launch the entire application:

```bash
# 1. Clone the repository
git clone https://github.com/Satyamurthi/HackBridge-V1.0.git
cd HackBridge-V1.0

# 2. Install all dependencies
npm install

# 3. Create your environment file from template
cp .env.example .env

# 4. Generate Prisma Client bindings & push database schema
npm run db:generate
npm run db:push

# 5. Seed the database with initial admin and sample data
npm run db:seed

# 6. Launch the development server
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 3. Architecture Overview

HackBridge is built as a unified full-stack Next.js application:

```
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── api/v1/               # Backend REST API Routes
│   │   │   ├── auth/             # Session, login, register, Google OAuth
│   │   │   ├── hackathons/       # Hackathon arenas, tracks, rules
│   │   │   ├── teams/            # Squad creation, members, credentials
│   │   │   ├── problems/         # Atomic problem allocations & locking
│   │   │   ├── payments/         # Razorpay & manual UTR payment verifications
│   │   │   ├── submissions/      # Deliverables & GitHub commit synchronizer
│   │   │   ├── evaluations/      # Multi-judge scoring rubrics & audit trails
│   │   │   └── admin/            # Super Admin configurations & analytics
│   │   ├── (auth)/               # Frontend authentication views
│   │   ├── about/                # About page, Technical Team, Spark Ignitors, Special Mentions
│   │   ├── hackathons/           # Public arena discovery & registration
│   │   ├── host/                 # Collegiate host organizer dashboard
│   │   ├── judge/                # Judge scoring and evaluation portal
│   │   ├── student/              # Participant team room & ID pass
│   │   ├── globals.css           # Global Tailwind & Light/Dark design system
│   │   └── layout.tsx            # Global Root Layout with 3D Canvas
│   ├── components/               # Reusable UI & architectural components
│   │   ├── layout/               # Navbar, Footer, Global 3D Canvas
│   │   └── ui/                   # Buttons, cards, modals, form controls
│   └── lib/                      # Backend shared utilities & services
│       ├── prisma.ts             # Prisma ORM singleton client
│       ├── auth.ts               # JWT signing, verification, and cookie sessions
│       ├── github.ts             # GitHub REST API repository sync client
│       └── razorpay.ts           # Razorpay client & webhook verifier
├── prisma/
│   ├── schema.prisma             # Full relational database schema
│   ├── backend.db                # SQLite database file (local dev)
│   └── seed.ts                   # Database seeding script
├── tests/                        # Vitest automated test suites (150+ tests)
└── public/                       # Static branding, images, and logos
```

---

## 4. Backend Setup & Configuration

### 4.1. Environment Variables Configuration (`.env`)

Configure the following variables in your `.env` file:

```env
# ─── Database ──────────────────────────────────────────────────
# SQLite for instant local zero-dependency development/testing:
DATABASE_URL="file:./backend.db"

# PostgreSQL for production environments:
# DATABASE_URL="postgresql://postgres:password@localhost:5432/hackbridge?schema=public"

# ─── Authentication & Security ─────────────────────────────────
# Minimum 32-character random string for signing JWT tokens and encryption:
JWT_SECRET="hackbridge-super-secret-jwt-key-minimum-32-chars-long!"
NEXTAUTH_URL="http://localhost:3000"

# ─── Super Admin Initialization ────────────────────────────────
ADMIN_EMAIL="admin@hackbridge.dev"
ADMIN_PASSWORD="YourSecureAdminPasswordHere!2026"

# ─── Google OAuth 2.0 (Optional for local dev) ─────────────────
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# ─── Razorpay Payment Gateway (Optional for local dev) ─────────
RAZORPAY_KEY_ID="rzp_test_placeholder_key"
RAZORPAY_KEY_SECRET="rzp_test_placeholder_secret"
RAZORPAY_WEBHOOK_SECRET="rzp_webhook_secret_key"

# ─── GitHub Integration (Optional for local dev) ───────────────
GITHUB_ORG_NAME="hackbridge-teams"
GITHUB_TOKEN="ghp_your_personal_access_token_with_repo_scope"

# ─── File Storage & Notifications ──────────────────────────────
S3_BUCKET="hackbridge-storage"
EMAIL_FROM="HackBridge <noreply@hackbridge.dev>"
```

---

### 4.2. Database Initialization (Prisma ORM)

HackBridge uses **Prisma ORM** with SQLite by default for zero-setup local execution, and natively supports PostgreSQL for production deployments.

1. **Generate Prisma Client bindings**:
   ```bash
   npm run db:generate
   ```
2. **Push the Schema to Database**:
   ```bash
   npm run db:push
   ```
   *(This creates all tables, relational foreign keys, indexes, and constraints without requiring external migration tooling).*

3. **Seed Database with Sample Arena & Super Admin**:
   ```bash
   npm run db:seed
   ```
   This initializes:
   - Super Admin credential based on your `.env` settings
   - Sample hackathon arenas with active timelines
   - Multi-track problem statements with slot allocations
   - Weighted judging rubrics and categories

4. **Visual Database Management (Prisma Studio)**:
   You can view and manage all database records via the web-based Prisma Studio GUI:
   ```bash
   npx prisma studio
   ```
   Open `http://localhost:5555` to browse tables (`User`, `Hackathon`, `Team`, `Submission`, `Evaluation`, etc.).

---

### 4.3. Backend API Endpoints Reference

The backend exposes RESTful JSON endpoints under `/api/v1/`:

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Email/password sign-in; issues JWT cookie | None |
| `POST` | `/api/v1/auth/register` | Student, Host, Judge, or Company sign-up | None |
| `GET` | `/api/v1/auth/me` | Fetches authenticated session profile | Cookie |
| `POST` | `/api/v1/auth/logout` | Clears authentication session cookie | Cookie |
| `GET` | `/api/v1/hackathons` | Lists all published hackathon arenas | None |
| `POST` | `/api/v1/hackathons` | Creates a new hackathon arena | Host / Admin |
| `GET` | `/api/v1/teams` | Queries team squad details & members | Student / Host |
| `POST` | `/api/v1/problems/select`| Atomic problem selection with row-level locking | Student |
| `POST` | `/api/v1/payments/utr` | Submits manual UTR payment receipt proof | Student |
| `POST` | `/api/v1/submissions` | Uploads milestone deliverables & triggers GitHub sync | Student |
| `POST` | `/api/v1/evaluations/score`| Submits weighted judge rubric evaluations | Judge |

---

## 5. Frontend Setup & UI Features

### 5.1. Running the Frontend Development Server

Start Next.js with hot reload enabled:

```bash
npm run dev
```

The frontend will be available at **`http://localhost:3000`**.

Alternative port shortcuts configured in `package.json`:
- `npm run dev:v5`: Runs the dev server on port `3010` (`next dev -p 3010`)

---

### 5.2. Frontend Architecture & Design System

- **Next.js 14 App Router**: Server-rendered components by default with client interactive islands (`"use client"`).
- **Tailwind CSS 3.4**: Clean utility classes combined with custom glass-panel abstractions (`.glass-panel`, `.glass-card-interactive`).
- **Interactive Global 3D Canvas**: Renders a particle sphere using Three.js and `@react-three/fiber` on the home and background canvas.
- **Dual Theme Support (Dark & Light Mode)**:
  - Default: Deep Obsidian Dark Mode (`#030407` void with `#0B0E18` cards and `#6366F1` indigo accents).
  - Light: High-contrast Light Mode (`#F8FAFC` background with `#FFFFFF` cards and crisp slate text).
  - Toggled dynamically via the Sun/Moon icon in the Navbar and persisted via `localStorage.getItem("hb_theme")`.
- **Pages Included**:
  - `/`: Hero landing page with 3D canvas, live statistics, and arena preview.
  - `/about`: Platform mission, architectural features, Technical Team roster, Spark Ignitors council, and Special Mentions tripartite institutional collaboration.
  - `/hackathons`: Arena discovery, track filtering, and team registration.
  - `/student`: Team management room, problem allocation, UTR payment uploads, and permanent Hackathon ID badges.
  - `/host`: Collegiate organizer portal for verifying teams, allocating slots, and monitoring live scores.
  - `/judge`: Secure scoring interface with weighted evaluation rubrics.

---

## 6. Testing & Quality Assurance

HackBridge maintains an automated testing suite ensuring zero-regression across authentication, atomic problem locking, payments, submissions, and UI sanity.

### 6.1. Running Automated Vitest Suite

To execute the test suite:

```bash
npm test
```

To run tests in interactive watch mode during active development:
```bash
npm run test:watch
```

---

### 6.2. Standing Protocol Test Loop (`npm run test:loop`)

For continuous autonomous validation, run:

```bash
npm run test:loop
```

- Synchronizes a dedicated, isolated test database (`test.db`).
- Runs the test suite in parallel.
- Generates markdown failure logs (`test-results/FAILURES.md`) or verification status (`test-results/STATUS.md`).
- Generates an interactive HTML test report at `test-results/index.html`.

---

### 6.3. End-to-End Playwright Tests (Optional)

To execute browser-level E2E tests across sign-in, registration, and arena flows:

```bash
npm run test:e2e
```

---

## 7. Production Build & Deployment

### 7.1. Compiling the Production Build

To create an optimized, minified production build:

```bash
npm run build
```

This validates all TypeScript types, generates optimized static chunks, and prepares the standalone output in `.next/`.

---

### 7.2. Running the Production Server

To start the production HTTP server on port 3000:

```bash
npm run start
```

Or on a custom port:
```bash
npx next start -p 8080
```

---

### 7.3. Production Process Management (PM2 Example)

To keep the application running persistently in production:

```bash
# Install PM2 globally
npm install -g pm2

# Build the app
npm run build

# Start the application with PM2
pm2 start npm --name "hackbridge" -- run start

# Save PM2 process list
pm2 save
pm2 startup
```

---

## 8. Troubleshooting & FAQ

### Issue 1: `command not found: node` or `npm`
**Solution**: Ensure Node v20 is loaded into your active shell session:
```bash
export PATH="/home/$(whoami)/.nvm/versions/node/v20.20.2/bin:$PATH"
```

### Issue 2: `PrismaClientInitializationError: Query engine library not found`
**Solution**: Re-generate the Prisma client for your current platform architecture:
```bash
npm run db:generate
```

### Issue 3: `Port 3000 is already in use`
**Solution**: Either kill the process on port 3000 or run on port 3010:
```bash
# Check process on 3000
lsof -i :3000
kill -9 <PID>

# Or run on alternative port
npm run dev:v5
```

### Issue 4: `SQLite database locked (dev.db-journal)`
**Solution**: SQLite file is temporarily held by a concurrent writer. Stop running dev processes, delete the `-journal` or `-wal` file if stale, and restart:
```bash
rm -f prisma/backend.db-journal prisma/dev.db-journal
npm run dev
```

---

## 9. Contributing & Git Protocol

When pushing changes to GitHub:
1. Always run `npm run test:loop` to ensure all 153+ tests pass.
2. Stage only project application files (`src/`, `public/`, `prisma/schema.prisma`, docs).
3. Commit with semantic messages (e.g. `feat:`, `fix:`, `docs:`):
   ```bash
   git add SETUP.md
   git commit -m "docs: add comprehensive frontend and backend setup guide"
   git push origin main
   ```

---

*Engineered with precision for collegiate hackathons by the HackBridge Team.*
