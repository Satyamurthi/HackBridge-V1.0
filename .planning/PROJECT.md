# Project Definition: HackBridge

## Overview
**HackBridge** is a high-assurance collegiate hackathon hosting and management platform that connects university students, collegiate/corporate hosts, judges, and super administrators. Engineered for institutional integrity, fair competition, and enterprise scale.

## Core Pillars & Architectural Invariants
1. **Permanent Student Identity**: Each student receives an immutable, permanent Hackathon ID (`HB-XXXXXX`) upon registration, bound for life.
2. **Single Active Hackathon Rule**: A student can belong to only one active hackathon registration (`ACTIVE` or `PENDING` payment where `endAt > now`), strictly enforced at the database layer.
3. **Verified Team Credentials**: Team ID (`TEAM-XXXXXX`) is generated strictly post-payment verification (Razorpay webhook signature or Host QR approval).
4. **Server-Clock Problem Masking & Balanced Slot Capping**: Problem statements are concealed on the server until `revealAt <= now`. Dynamic slot allocation cap = $\lceil \text{activeTeams} / \text{totalStatements} \rceil$ with atomic row-locking.
5. **Zero Secret Exposure**: Third-party API keys, webhook secrets, and authentication secrets are strictly isolated in memory and never sent over client APIs.
6. **Immutable Audit Trail**: Every administrative action, host approval, and submission unlock is permanently written to the audit log.

## Technology Stack
- **Framework**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Visuals & 3D**: Three.js WebGL particle field hero + dynamic scroll navigation
- **Database**: PostgreSQL / SQLite via Prisma ORM
- **Testing**: Vitest (Unit/Integration, 44 tests) + Playwright (Browser E2E, 4 tests)
- **Deployment**: Docker multi-stage alpine runner + GitHub Actions CI
