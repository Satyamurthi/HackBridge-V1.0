# HackBridge Architectural Assumptions & Design Invariants

This document records the architectural choices and technical interpretations made during the implementation of the HackBridge platform specification.

---

## 1. Cryptographic Identifiers
- **Student Hackathon ID (`HB-XXXXXX`)**: Permanent format starting with `HB-` followed by 6 alphanumeric uppercase characters (`A-Z0-9`). It is bound to the student profile for life across all events.
- **Team ID (`TEAM-XXXXXX`)**: Permanent format starting with `TEAM-` followed by 6 alphanumeric uppercase characters. Generated strictly upon payment confirmation (PRD Rule 3).

## 2. Rule 1: Single Active Hackathon Registration
- A student is considered to have an active registration if they are a Lead or Member of a team whose associated hackathon has `endAt > now` and whose team registration status is either `ACTIVE` or `PENDING` payment.
- Completed past hackathons do not restrict a student from entering new hackathons.
- Enforced at both lookup time (`/api/v1/students/lookup/[hackathonId]`) and team creation transaction (`/api/v1/teams`).

## 3. Rule 4: Balanced Problem Statement Caps
- Dynamic Cap = `Ceil(totalActiveTeams / totalStatements)`.
- If an explicit cap is defined on the problem statement record (`cap > 0`), the minimum or explicit cap is respected.
- Selection is executed in an atomic database transaction with current assignment counting to prevent race conditions during high-concurrency reveal moments.

## 4. Rule 6: Milestone Progress Updates
- Increments in 10% steps (10%, 20%, 30% ... 100%).
- Strictly non-decreasing: any attempt to submit a percentage less than or equal to previous updates is rejected with HTTP 400.
- Visible strictly to the Host and assigned Judges of the hackathon; never disclosed on public endpoints.

## 5. Rule 7: Submission Locking & Host Unlock
- Final project submissions set `locked: true` upon student submission.
- Unlocking can only be initiated by the Host who owns the hackathon.
- Unlocking mandates an audit explanation string (`unlockReason`) and writes an immutable record to `audit_logs`.

## 6. Rule 8: Results Privacy
- On `GET /api/v1/teams/[teamId]/result`, server verifies whether the authenticated caller is the Team Lead or a registered Team Member.
- Unauthorized callers or other participating teams cannot view other teams' scores, rubric breakdowns, or private feedback.

## 7. Storage & Virus Scanning
- File uploads are checked for allowed extensions and size limits (< 10MB default).
- Binary payloads are marked non-executable with `Content-Disposition: attachment` and stored in isolated object storage paths.
