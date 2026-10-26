# HackBridge Product Roadmap

#### Phase 1: Foundation
- Status: Completed (12/12 tests passed)
- Scope: Project setup, design system tokens, auth with bcrypt/JWT, permanent `HB-XXXXXX` and `TEAM-XXXXXX` generators, live student lookup API.

#### Phase 2: Host & Listing
- Status: Completed (5/5 tests passed)
- Scope: Multi-step hackathon builder wizard, rules gate, public listing and filters, detail page with countdown, Super Admin host approval queue.

#### Phase 3: Apply & Pay
- Status: Completed (6/6 tests passed)
- Scope: Squad formation by Hackathon ID, Rule 1 enforcement, Razorpay Orders API + signed HMAC webhook, QR receipt upload and host review queue.

#### Phase 4: Event Day
- Status: Completed (5/5 tests passed)
- Scope: Problem statement server-clock reveal, balanced allocation capping with atomic row locking, GitHub repo provisioning, 10% progress updates, immutable submission locking and host audit unlock.

#### Phase 5: Judging & History
- Status: Completed (5/5 tests passed)
- Scope: Judge signup and host approval, weighted rubric evaluation, host-only private leaderboard, results publication, Rule 8 teams-only results privacy, student portfolio history.

#### Phase 6: Hardening & Launch
- Status: Completed (11/11 tests passed + 4/4 Playwright tests)
- Scope: High-concurrency unlock load test, full student journey E2E test, Playwright browser test suite, Super Admin CMS & Settings, multi-stage Dockerfile, GitHub Actions CI, architecture documentation.
