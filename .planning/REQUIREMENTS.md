# Functional & Non-Functional Requirements: HackBridge

## Functional Requirements (FR)

### FR-1: Authentication & Permanent IDs
- 4 Role-based access levels: `STUDENT`, `HOST`, `JUDGE`, `SUPER_ADMIN`.
- Passwords hashed with bcrypt; secure HTTP-only JWT session cookies.
- Permanent cryptographic IDs: `HB-XXXXXX` (Student) and `TEAM-XXXXXX` (Team).

### FR-2: Host Builder & Discovery
- Multi-step builder wizard at `/dashboard/host/create` with domains, problem statements, and rubric criteria.
- Rules gate acceptance modal on public hackathon detail view.
- Super Admin host moderation queue (Approve, Pause, Reject).

### FR-3: Apply & Pay
- Team Lead adds teammates by permanent `HB-XXXXXX` ID.
- Rule 1 validation checks across active hackathon timeframes.
- Razorpay Orders integration with signed HMAC verification + manual QR proof upload and host approval queue.

### FR-4: Event Day Live Arena
- Server-clock problem statement reveal (`revealAt <= now`).
- Balanced allocation cap: $\lceil \text{teams} / \text{statements} \rceil$ with atomic row-locking.
- Automatic GitHub repository record provisioning (`hackbridge-[TEAM-ID]`).
- 10% progress updates, timestamped, strictly non-decreasing.

### FR-5: Judging & Leaderboard
- Judge application requiring valid Hackathon ID and Host approval.
- Weighted rubric criteria scoring: $\sum(\text{score} \times \text{weight}) / \sum(\text{weight})$.
- Host-only private leaderboard until official results publication.
- Rule 8 Results Privacy: Teams view strictly their own scores and certificates.

### FR-6: Super Admin Command Console & CMS
- Site CMS editor for global announcements, banners, and hero notifications.
- Rule 9 Zero-Exposure secret status verification.
- Rule 10 platform audit trail stream.

## Non-Functional Requirements (NFR)
- **Security**: Role checks on server; encrypted secrets; CSRF and XSS protection.
- **Data Privacy**: India DPDP Act compliance; minimal student data collection.
- **Performance**: High concurrency support during problem reveal moments.
- **Accessibility**: WCAG 2.1 AA compliant; `prefers-reduced-motion` detection.
