# HackBridge Production Deployment Guide

This document specifies the target architecture, environment variables, security checklist, database migrations, and operational guidelines for deploying **HackBridge** to staging and production environments.

---

## 1. Architecture Overview

- **Frontend & API Gateway**: Next.js 14 App Router running in standalone mode inside a lightweight Alpine Docker container or on Vercel.
- **Database**: Managed PostgreSQL (Supabase, Neon, AWS RDS, or Render Postgres) with Prisma ORM.
- **Cache & Message Broker**: Upstash Redis or AWS ElastiCache for rate limiting and event queues.
- **Object Storage**: S3-compatible object storage (AWS S3, Cloudflare R2, or MinIO) for QR payment receipts, virus-scanned code archives, and team submission links.
- **Payment Gateway**: Razorpay Orders API with cryptographically signed SHA-256 HMAC webhooks.
- **Source Control Provisioning**: GitHub REST API utilizing organization machine tokens.

---

## 2. Environment Variables Checklist

Ensure these variables are securely populated in your deployment vault (e.g., AWS Secrets Manager, Vercel Project Settings, Doppler):

| Variable | Requirement | Description |
|---|---|---|
| `DATABASE_URL` | **Required** | `postgresql://user:pass@host:5432/dbname?sslmode=require` |
| `JWT_SECRET` | **Required** | 32+ character high-entropy key for HMAC-SHA256 session cookies |
| `NODE_ENV` | **Required** | `production` |
| `RAZORPAY_KEY_ID` | Optional / Prod | Razorpay public key ID (`rzp_live_...` or `rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | Optional / Prod | Razorpay private secret (Rule 9: never exposed to client) |
| `RAZORPAY_WEBHOOK_SECRET` | Optional / Prod | Shared secret for verifying webhook HMAC signatures |
| `GITHUB_TOKEN` | Optional / Prod | Fine-grained GitHub PAT with `repo` admin permissions |
| `GITHUB_ORG` | Optional / Prod | Organization slug under which team repositories are created |
| `REDIS_URL` | Optional | `redis://...` for distributed session and rate limiting |

---

## 3. Database Migration & Provisioning

### Staging Deployment:
```bash
# Push Prisma schema to Postgres staging instance
npx prisma db push

# Seed platform super admin, seed hosts, judges, and students
npx tsx prisma/seed.ts
```

### Production Deployment:
```bash
# Apply versioned migrations safely
npx prisma migrate deploy

# Verify schema health
npx prisma db pull
```

---

## 4. Docker Deployment

### Building the Image:
```bash
docker build -t hackbridge:latest .
```

### Running the Container:
```bash
docker run -d \
  --name hackbridge \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="production_secret_key_..." \
  -e NODE_ENV="production" \
  hackbridge:latest
```

---

## 5. Security & Invariant Checklist

- [x] **PRD Rule 1**: Single active registration enforced at database transaction layer.
- [x] **PRD Rule 2**: Team lead adds teammates by permanent `HB-XXXXXX` ID before redirecting to payment.
- [x] **PRD Rule 3**: Team ID `TEAM-XXXXXX` generated strictly upon payment verification.
- [x] **PRD Rule 4**: Problem statements masked server-side until countdown expiry; balanced slot allocation capped at `ceil(teams / statements)`.
- [x] **PRD Rule 5**: Judges and hosts cannot act without explicit approval.
- [x] **PRD Rule 6**: Progress updates recorded in 10% steps, timestamped, strictly non-decreasing.
- [x] **PRD Rule 7**: Final submissions locked immutably; unlockable only by Host with mandatory audit reason.
- [x] **PRD Rule 8**: Teams see only their own results; filtered on server.
- [x] **PRD Rule 9**: Zero client exposure of secrets or API tokens.
- [x] **PRD Rule 10**: Immutable audit logging for all host and administrator governance actions.
