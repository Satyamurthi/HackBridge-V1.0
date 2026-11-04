# HackBridge Setup & Configuration Guide

This document details the configuration requirements for HackBridge, including Google OAuth 2.0, Razorpay, GitHub REST API, and production environment settings.

---

## 1. Google OAuth 2.0 Setup

HackBridge supports unified Google Sign-In for all 4 roles (Students, Colleges, Companies, Judges).

### Prerequisites
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a Google Cloud Project (e.g., `hackbridge-production`).
3. Navigate to **APIs & Services** > **OAuth consent screen**.
   - User Type: **External**
   - App Name: `HackBridge`
   - User Support Email: your support email
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
4. Navigate to **APIs & Services** > **Credentials**.
5. Click **Create Credentials** > **OAuth client ID**.
   - Application type: **Web application**
   - Name: `HackBridge Web Client`

### Authorised Redirect URIs
Add the following to **Authorised redirect URIs**:
- **Local Development**:
  ```text
  http://localhost:3000/api/v1/auth/google/callback
  ```
- **Production** (replace with your custom production domain):
  ```text
  https://yourdomain.com/api/v1/auth/google/callback
  ```

### Authorised JavaScript Origins
- **Local Development**:
  ```text
  http://localhost:3000
  ```
- **Production**:
  ```text
  https://yourdomain.com
  ```

### Environment Variables
Copy the generated Client ID and Client Secret into your `.env` file:
```env
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-google-client-secret"
NEXTAUTH_URL="http://localhost:3000"
```

---

## 2. Super Admin Account

Per PRD and Prompt 9 requirements:
- A single Super Admin account is initialized via seed script reading from environment variables:
```env
ADMIN_EMAIL="admin@hackbridge.dev"
ADMIN_PASSWORD="SecurePassword@123"
```
- No hardcoded demo credentials are used in source code.
- Run `npm run db:seed` to provision the initial Super Admin.

---

## 3. Host Payments (Razorpay & UPI QR)

Each collegiate/enterprise host configures their own credentials in **Host Console > Payments Setup**:
- **Razorpay Key ID & Key Secret**: Encrypted via AES-256-GCM using `JWT_SECRET` and stored in the database. Key secrets are never sent to the client.
- **UPI QR & Bank Name**: Used for manual UTR payment proofs with automated receipt generation and team issuance upon host verification.

---

## 4. GitHub Integration (GITHUB_TOKEN)

Used for automated GitHub repository synchronization and stage document commits per squad:
```env
# GitHub Personal Access Token (PAT) with `repo` scope permissions
GITHUB_TOKEN="ghp_your_personal_access_token_with_repo_scope"
GITHUB_ORG_NAME="hackbridge-org"
```

### Configuration & Security Invariants:
1. **Repository Modes**:
   - **Per-Team Repository Mode**: Each squad gets its own repository named `hackbridge-{teamId}`.
   - **Organization Repository Mode**: All squad documents are committed into a centralized organization repository configured via Super Admin Settings (`github_org_repo`).
2. **Automated Commit Directory Structure**:
   `{hackathonSlug}/{teamId}/Part_{stage}/{fileName}`
   Example: `hack-ai-summit-2026/TEAM-849102/Part_1/Architecture_Design_v1.pdf`
3. **Commit Message Format**:
   `[HackBridge] Team {teamId} uploaded Part {stage} v{version}: {fileName} (by {uploaderName})`
4. **Safety & Zero-Leakage Policy**:
   - `GITHUB_TOKEN` is strictly read server-side from `process.env.GITHUB_TOKEN`.
   - Never hardcoded in source files.
   - Never exposed to the client or returned in any API payload.
   - Never logged to console or audit log metadata.
5. **Fault Tolerance & Background Retries**:
   - If GitHub API is temporarily unreachable or rate-limited, uploads are persisted locally with status `Failed with Retry` and an error message ("GitHub is temporarily unavailable. Queued for background retry"). Raw stack traces or GitHub API secrets are never exposed to users.

---

## 5. Development Commands

```bash
# Install dependencies
npm install

# Push schema migrations
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Seed Super Admin
npm run db:seed

# Run dev server
npm run dev

# Run Vitest test suite
npm test
```
