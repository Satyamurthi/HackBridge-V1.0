# HackBridge Pilot Collegiate Runbook

## Overview
This runbook guides university administrators, hackathon leads, and platform engineers through organizing and launching a pilot collegiate hackathon on **HackBridge**.

---

## 1. Timeline & Checklist

### T-14 Days: Host Onboarding & Approval
- [ ] Host registers at `/signup/host` with institutional collegiate credentials.
- [ ] Super Admin reviews and approves host profile at `/dashboard/admin`.
- [ ] Host logs in at `/login` and creates the hackathon draft at `/dashboard/host/create`:
  - Define domains, problem statements, and reveal timestamps (`revealAt`).
  - Configure team size bounds `[teamMin, teamMax]`.
  - Set fee (INR) and select payment mode (`QR` or `RAZORPAY`).
  - Build weighted rubric criteria (e.g. Technical 0.5, Innovation 0.3, UX 0.2).
- [ ] Host publishes the hackathon track.

### T-7 Days: Student Registration & Squad Assembly
- [ ] Students sign up at `/signup/student` and receive permanent `HB-XXXXXX` Hackathon IDs.
- [ ] Designated Team Leads navigate to `/hackathons/[slug]/apply`.
- [ ] Lead enters team name and searches teammates by their permanent `HB-XXXXXX` ID.
- [ ] Platform automatically verifies Invariant Rule 1 (no overlapping active registrations).
- [ ] Lead submits application; team status transitions to `PENDING` payment.

### T-24 Hours: Payment Verification & Pre-Flight
- [ ] If using QR payment:
  - Lead uploads transaction reference / UTR proof.
  - Host verifies payment queue at `/dashboard/host/payments` and clicks Approve.
  - Team status becomes `ACTIVE` and permanent `TEAM-XXXXXX` is automatically generated.
- [ ] If using Razorpay:
  - Automated webhook signature verifies payment and promotes squad to `ACTIVE`.
- [ ] Test health check endpoint: `curl -I https://hackbridge.domain/api/health`.
- [ ] Run automated database backup: `./scripts/backup-db.sh`.

### Day of Hackathon: Live Event Arena
- [ ] **Reveal Moment Countdown**:
  - Problem statements unlock automatically when server clock reaches `revealAt`.
  - Teams enter `/dashboard/student/arena/[teamId]`.
  - Lead selects a problem statement. Server transaction enforces balanced allocation cap:
    $$\text{Cap} = \left\lceil \frac{\text{Total Active Teams}}{\text{Total Problem Statements}} \right\rceil$$
  - Automatic GitHub repository record is provisioned (`hackbridge-[TEAM-ID]`).
- [ ] **Milestone Checkpoints**:
  - Teams record progress in 10% steps (10%, 20%, 30% ... 100%).
  - Progress updates are timestamped and strictly non-decreasing.
- [ ] **Submission Locking**:
  - Team lead submits final demo link, code repository URL, and architecture description.
  - Submission locks immutably (`locked: true`).
  - If a team requires revision, Host unlocks with mandatory audit log reason.

### Evaluation & Winner Certification
- [ ] Judges log in at `/dashboard/judge` and evaluate submissions across weighted rubric criteria.
- [ ] Host inspects auto-computed weighted leaderboard at `/dashboard/host/leaderboard/[hackathonId]`.
- [ ] Host certifies awards and publishes results.
- [ ] Invariant Rule 8 verified: Students log into `/dashboard/student/history` and view their certified rank and private feedback.
