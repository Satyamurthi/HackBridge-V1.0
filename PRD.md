# HackBridge Product Requirements Document (PRD.md)

## Objective
Build and harden HackBridge, a high-assurance collegiate hackathon hosting and management platform connecting university students, host institutions (colleges & companies), judges, and super administrators.

---

## Task Backlog & Phase Status

### [x] Task 1: Phase 1 — Foundation & Permanent IDs
- Implement Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma ORM.
- Build RBAC authentication (STUDENT, HOST, JUDGE, SUPER_ADMIN) with bcrypt hashing and signed JWT session cookies.
- Cryptographic ID generation: permanent `HB-XXXXXX` (Student) and `TEAM-XXXXXX` (Team post-payment).
- Seed initial data for all 4 personas with demo credentials.
- Unit test suite: 12/12 passed (`tests/phase1-auth-roles.test.ts`).

### [x] Task 2: Phase 2 — Host Builder & Discovery
- Multi-step hackathon creation wizard (`/dashboard/host/create`) with domains, problem statements, and weighted rubric criteria.
- Rules gate modal acceptance on detail page (`/hackathons/[slug]`).
- Super Admin host moderation queue (`/dashboard/admin`).
- Server-clock masking of unrevealed problem statements until countdown expiry.
- Unit test suite: 5/5 passed (`tests/phase2-host-listing.test.ts`).

### [x] Task 3: Phase 3 — Squad Formation & Payments
- Squad application with dynamic size limits `[teamMin, teamMax]`.
- Enforce Invariant Rule 1: A student can belong to only one active hackathon (`ACTIVE` or `PENDING` where `endAt > now`).
- Enforce Invariant Rule 2: Only the team lead adds members by `HB-XXXXXX` and proceeds directly to payment.
- Razorpay Orders API + signed HMAC webhook verification.
- Manual QR payment receipt upload + host payment review queue.
- Generate permanent `TEAM-XXXXXX` ID strictly upon verified payment.
- Unit test suite: 6/6 passed (`tests/phase3-apply-pay.test.ts`).

### [x] Task 4: Phase 4 — Event Day & Live Workspace
- Problem statement reveal at `revealAt <= now`.
- Balanced allocation cap: $\lceil \text{activeTeams} / \text{totalStatements} \rceil$ with atomic row-locking.
- Automatic GitHub repository record provisioning (`hackbridge-[TEAM-ID]`).
- 10% progress updates, timestamped, strictly non-decreasing.
- Immutable final project submission locking with audit-logged host unlock.
- Unit test suite: 5/5 passed (`tests/phase4-event-day.test.ts`).

### [x] Task 5: Phase 5 — Judging & History Archive
- Judge application requiring valid Hackathon ID and host approval.
- Weighted rubric criteria scoring: $\sum(\text{score} \times \text{weight}) / \sum(\text{weight})$.
- Host-only private leaderboard and awards certification.
- Enforce Invariant Rule 8: Teams see only their own results; server-enforced privacy barrier.
- Student permanent career portfolio archive (`/dashboard/student/history`).
- Unit test suite: 5/5 passed (`tests/phase5-judging-history.test.ts`).

### [x] Task 6: Phase 6 — Hardening, E2E & Visual Excellence
- High-concurrency problem statement unlock load test (`tests/phase6-load-test-unlock.test.ts`).
- Full student journey E2E integration test suite (`tests/phase6-e2e-student-journey.test.ts`).
- Playwright browser E2E test suite (`tests/e2e/student-journey.spec.ts`).
- Three.js WebGL hero background: rotating dotted globe with Fibonacci distribution, global university city hubs, elevated glowing connection arcs, starfield, and mouse reaction.
- Single accent `#6366F1` and dark obsidian `#030407` design system (`DESIGN-SYSTEM.md`).
- Multi-stage Dockerfile and GitHub Actions CI workflow (`.github/workflows/ci.yml`).

### [x] Task 7: Phase 7 — Production Operations & Health Monitoring
- Public automated platform health check API at `/api/health` returning system uptime, database latency, and secret configuration statuses.
- Automated database snapshot backup script (`scripts/backup-db.sh`) with retention policy.
- Pilot Collegiate Runbook (`docs/PILOT_RUNBOOK.md`) detailing pre-flight checklists, host onboarding, and live day contingency operations.
