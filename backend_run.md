# HackBridge Backend & Server Run Guide

This document provides a comprehensive, step-by-step guide for running, configuring, and managing the HackBridge platform on this server.

---

## 1. System Requirements & Environment

- **Operating System**: Linux (Ubuntu, Debian, Fedora, Arch, etc.)
- **Node.js**: v20.x or higher (Current server runtime: `v20.20.2`)
- **Package Manager**: npm v10.x or higher
- **Database**: SQLite (built-in zero-dependency) or PostgreSQL

### Loading Node.js & Tooling Path
If Node.js is managed via NVM on this server, ensure the path is exported in your shell session:

```bash
export PATH="/home/mitt_phoenix/Utility_LNX/HackBridge-V1.0-main/.bin:/home/mitt_phoenix/.nvm/versions/node/v20.20.2/bin:$PATH"
```

To verify:
```bash
node -v   # Should return v20.20.2 or higher
npm -v    # Should return 10.8.2 or higher
```

---

## 2. Project Directory & Environment Configuration

Navigate to the project root:
```bash
cd /run/media/mitt_phoenix/Utility_LNX/HackBridge-V1.0-main
```

Ensure `.env` exists in the root directory. Key variables include:

```env
# Database configuration (SQLite default)
DATABASE_URL="file:./backend.db"

# Authentication secret
JWT_SECRET="hackbridge-super-secret-jwt-key-minimum-32-chars-long!"
NEXTAUTH_URL="http://localhost:3000"

# Razorpay credentials (if online payments enabled)
RAZORPAY_KEY_ID="rzp_test_placeholder_key_id"
RAZORPAY_KEY_SECRET="rzp_test_placeholder_key_secret"
RAZORPAY_WEBHOOK_SECRET="rzp_webhook_secret_key"
```

---

## 3. Dependency Installation & Database Initialization

### Step 3.1: Install Dependencies
```bash
npm install
```

### Step 3.2: Generate Prisma Client & Sync Schema
```bash
npm run db:generate
npm run db:push
```

### Step 3.3: Seed Initial Data (Optional for fresh setup)
To seed initial admin, host, judge, and sample hackathon records:
```bash
npm run db:seed
```

---

## 4. Building the Application

Compile the Next.js application bundle:

```bash
npm run build
```

This compiles all frontend routes, API endpoints, dynamic layouts, and static optimization chunks into `.next/`.

---

## 5. Running the Backend Server

### Option A: Run Production Server on Port 3000 (Recommended)
This starts the production server listening on `http://localhost:3000`:

```bash
npm run start
```
*(Alternative direct command: `npx next start -p 3000`)*

---

### Option B: Run in Development Mode with Live-Reload
Useful when actively modifying code:

```bash
npm run dev
```

---

### Option C: Run Staging / Testing Server on Port 3010
To test new features or updates on a separate port without disturbing the port 3000 server:

- **v5.0 Production Mode on Port 3010**:
  ```bash
  npm run start:v5
  ```
- **v5.0 Development Mode on Port 3010**:
  ```bash
  npm run dev:v5
  ```
*(Legacy shortcuts `start:v4`, `start:v3` are also maintained for backwards compatibility).*

---

### Option D: Run as a Persistent Background Daemon

To keep the server running in the background after logging out of the terminal:

#### Using `nohup`:
```bash
nohup npx next start -p 3000 > server_3000.log 2>&1 &
```

To monitor logs:
```bash
tail -f server_3000.log
```

To stop the background server:
```bash
fuser -k 3000/tcp
```

---

## 6. Exposing the Server to the Public Internet (Cloudflare Tunnel)

To make the local port 3000 server publicly accessible via HTTPS:

```bash
./bin/cloudflared tunnel --url http://127.0.0.1:3000
```
*(Or use `/home/mitt_phoenix/.local/bin/cloudflared tunnel --url http://127.0.0.1:3000`)*

> [!TIP]
> **Use `127.0.0.1` instead of `localhost`**: Using the direct IPv4 numeric address `127.0.0.1` bypasses local name resolution (`/etc/nsswitch.conf`) and avoids triggering unnecessary mDNS lookups to `avahi-daemon`.

The tunnel will output a public URL (e.g. `https://flat-banners-len-cabinets.trycloudflare.com`) routing external internet traffic directly to `http://127.0.0.1:3000`.

---

## 7. Running the Automated Test Suite

HackBridge includes a self-fixing Vitest test suite running against an isolated `test.db`:

```bash
npm run test:loop
```

- Results and test statuses are automatically recorded in `test-results/STATUS.md`.
- Ensure all 95 tests pass before deploying changes.

---

## 8. Server Health Checks & Troubleshooting

### Check Listening Ports
```bash
ss -tlpn | grep -E '3000|3010'
```

### Free Up / Kill Processes on Ports
If a port is already bound by another process:
```bash
fuser -k 3000/tcp
fuser -k 3010/tcp
```

### Verify Local HTTP Response
```bash
curl -I http://localhost:3000/
curl -I http://localhost:3010/
```

### Check SQLite Database Integrity
```bash
npx prisma studio
```
*(Opens Prisma Studio web interface on `http://localhost:5555` to view database tables and rows).*

---

## 9. Resolving Avahi-Daemon 100% CPU Spike & Firefox on Linux

### Root Cause
On Linux systems, two factors can cause `avahi-daemon` to spike to 100% on a CPU core (e.g., Core 9) and freeze Firefox:
1. **mDNS Query Loops via `localhost`**: Connecting tunnels or reverse proxies using the hostname `localhost` causes the C library (`glibc`) to consult `mdns4_minimal` in `/etc/nsswitch.conf`, sending queries to `avahi-daemon`.
2. **Firefox WebRTC Host Address Obfuscation**: By default, Firefox generates randomized `.local` hostnames for WebRTC ICE candidates to prevent IP leaks. On Linux with Avahi, querying these `.local` addresses on port 5353 can trigger an infinite multicast loop.
3. **Heavy WebGL Overdraw**: A full-screen transparent WebGL canvas with multi-sampling (MSAA) running across all pages causes Firefox's GPU process on Linux Mesa/DRI drivers to allocate excessive virtual memory (over 30GB VIRT) and hang.

### What Was Optimized in v3.0 Application Code:
- **Automatic 2D Canvas Fallback on Linux Firefox**: On Linux Firefox, the 3D background automatically runs a lightweight 2D canvas with zero WebGL allocation, reducing GPU memory from 32GB to 0MB and CPU usage to <0.2%.
- **Route Suppression**: The background renderer is completely bypassed on all dashboard (`/dashboard/*`) and authentication (`/login`, `/signup`, `/register`) routes.
- **Permissions-Policy Header**: Added `camera=(), microphone=(), geolocation=()` to stop Firefox from scanning media devices or initiating ICE candidate discovery.
- **Disabled Custom Cursor on Firefox**: Replaced React re-render cursor tracking with native cursor handling on Firefox to eliminate compositor repaint storms.

### Immediate System-Level Fixes for Linux Users:

1. **Restart Avahi Daemon** (instantly clears any active Core 9 spin loop):
   ```bash
   sudo systemctl restart avahi-daemon
   ```

2. **Disable Avahi Daemon entirely** (if you do not use network printers or `.local` discovery):
   ```bash
   sudo systemctl stop avahi-daemon
   sudo systemctl disable avahi-daemon
   ```

3. **Tame Firefox WebRTC mDNS in `about:config`**:
   - Open Firefox and navigate to `about:config`
   - Search for: `media.peerconnection.ice.obfuscate_host_addresses`
   - Set it to: `false`
   - Search for: `media.peerconnection.ice.default_address_only`
   - Set it to: `true`

---

## 10. Release v5.0 Core Features & Invariants

Release v5.0 (`package.json`: `5.0.0`) introduces critical submission gating and unified evaluation invariants:

1. **Sequential Phase Upload Blocking**:
   - A phase upload is strictly blocked until the prior phase has been uploaded and submitted.
   - Phase 2 upload requires Phase 1 upload to be completed first; Phase 3 requires Phase 2; Phase 4 requires Phase 3.
2. **Mandatory Final Submission Fields Gate**:
   - Final submission is disabled until all required fields are filled:
     - Source Code / Live Demo URL
     - Application Binary / APK / Release File URL
     - Technical Architecture Write-Up
   - In addition, all Part 4 deliverables (Complete Code ZIP, Documentation PDF, Presentation PPT) must be uploaded.
3. **Single Unified Rubric Policy for All Phases**:
   - Only **one single unified rubric** is defined for evaluating squads across all phases.
   - Judges move across participant deliverables (Phase 1 → Phase 2 → Phase 3 → Phase 4) in the portal on the left, while the evaluation scorecard on the right remains persistent and unified.
   - Rubric criteria are never split or reset per phase; marks and notes remain persistent as the judge navigates across deliverables.

---

## 11. Complete Judge Experience & Evaluator Portal Architecture

The Judge evaluation system provides end-to-end dedicated pages and subroutes for the entire jury workflow:

1. **Judge Registration Portal**:
   - URL: `/register/judge` (and `/signup/judge`)
   - Collects evaluator credentials, professional title, organization, domain track specialization, and target hackathon selection.
   - Features Google Sign-In and fast-track admin approval contact (`9380968402` / `admin@hackbridge.dev`).

2. **Judge Dashboard & Multi-Tab Command Center**:
   - URL: `/dashboard/judge`
   - Real-time evaluation queue, domain filters, cohort progress metrics, deliverable inspection, and persistent unified scorecard.

3. **Dedicated Standalone Subroutes**:
   - `/dashboard/judge/assigned`: Dedicated view of all assigned hackathon tracks, domain focus, squad counts, and track-switch actions.
   - `/dashboard/judge/scoring`: Direct route / redirect to the Evaluation Queue & Scoring Console (`?tab=queue`).
   - `/dashboard/judge/history`: Dedicated Evaluation History registry displaying scored squads, certified marks, criterion breakdown, and re-evaluation actions.
   - `/dashboard/judge/rubric`: Complete 9-point rubric guide with criteria weights, phase deliverable guidelines, and jury integrity standards.
   - `/dashboard/judge/profile`: Dedicated Evaluator Profile & Account Security Console featuring profile editing, password change, and clearance status.
   - `/dashboard/judge/evaluate/[teamId]`: Focused single-squad evaluation console with side-by-side deliverable navigation and single unified rubric scoring.
   - `/dashboard/judge/leaderboard/[hackathonId]`: Live computed weighted leaderboard and standings for the judge's assigned arena.

4. **Judge Backend APIs**:
   - `GET /api/v1/judge/profile`: Fetches evaluator details, assigned hackathons, and certified evaluation statistics.
   - `PATCH /api/v1/judge/profile`: Updates profile details (name, phone, company, designation, domain) and password with cryptographic verification.
   - `GET /api/v1/judge/submissions`: Returns squad submissions, Phase 1 to Phase 4 deliverables, and rubric criteria enforcing `rubricPolicy: "SINGLE_UNIFIED_ALL_PHASES"`.
   - `POST /api/v1/judge/score`: Saves draft or certified final scores across all criteria for a squad.


