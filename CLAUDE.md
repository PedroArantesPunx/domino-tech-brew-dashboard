# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time Slack financial dashboard monitoring system for Domino Tech & Brew. Collects hourly financial reports from Slack, processes metrics (GGR, NGR, Turnover, Deposits, Withdrawals), and displays them via an interactive React dashboard with authentication.

**Production:** https://techandbrew.com.br
**Stack:** React 18 + Node.js 18 + Docker + Nginx + Vercel (frontend)
**Data:** 33,501+ records in alertas.json (JSON file database)
**Auth:** Basic username/password authentication with JWT tokens

## Architecture

### Data Flow
```
Slack Channel → Backend Parser → Validation → alertas.json → API Aggregation → JWT Auth → Frontend Dashboard
```

### Key Components

**Backend** (`backend/server.js` - 2,788 lines)
- Express API with 28+ endpoints
- **SECURE:** JWT authentication with bcrypt password hashing (USERS object in server.js:43-50)
- **SECURE:** Fingerprint.com integration for fraud detection
- Slack Web API integration (@slack/web-api)
- Two message parsers: "Relatório de Performance de Produtos" and "Relatório Time de Risco"
- Hourly data aggregation via `aggregateDataByHour()` function
- **Critical:** All timestamps use America/Sao_Paulo timezone (UTC-3)
- Persistent storage: `alertas.json` + `fingerprintData.json` (volume-mounted)

**Frontend** (`src/App.js` - 4,000+ lines)
- Single-page React app with 4 isolated dashboard tabs: **Overview**, **Performance**, **Risco**, **Anomalias**
- Login screen with JWT token management (localStorage)
- Recharts for 12+ chart types (Line, Bar, Area, Pie, Gauge, Composed, etc.)
- **Critical:** Must use `useCallback`/`useMemo` to prevent React Error #31
- **Critical:** Never create inline arrays in JSX (causes minified React error)
- **Critical:** All data filtering MUST sort by timestamp before applying period filters (UTC-3)
- Auto-refresh every 30s (optional)
- Dark mode with seguro.bet.br-inspired color palette

**Dashboard Tabs Structure:**
- **Overview:** Main metrics with ComposedChart showing GGR/NGR/Turnover trends
- **Performance:** Casino vs Sportsbook analysis with 3 time-series charts (GGR LineChart, NGR AreaChart, Turnover BarChart)
- **Risco:** Risk management metrics (deposits, withdrawals, bonuses, users)
- **Anomalias:** Critical alerts and data quality monitoring

**Infrastructure**
- Frontend: Dual deployment - Vercel (production) + Nginx container (local/testing)
- Backend: Node.js container (port 3001) with restart policy `unless-stopped`
- Health checks: `/api/health` (backend), `http://localhost` (frontend)
- Docker Compose orchestration with `dashboard-network` bridge
- CI/CD: GitHub Actions deploy frontend to Vercel on push to main

## Security Features (Implemented Nov 2025)

### Password Security with bcrypt
**Status:** ✅ Implemented
**Location:** `backend/server.js:118-156`

- All passwords now stored as bcrypt hashes (salt rounds: 10)
- Default password: `domino2024` (hash stored in USERS object)
- **IMPORTANT:** Never store plaintext passwords
- Password hash stored in environment variable: `ADMIN_PASSWORD_HASH`

**Generate new password hash:**
```bash
node backend/utils/generate-password-hash.js "sua_senha_aqui"
```

**Update password:**
1. Generate hash using script above
2. Update `backend/.env`: `ADMIN_PASSWORD_HASH="$2a$10$..."`
3. Restart backend: `docker compose restart backend`

### Fingerprint.com Fraud Detection
**Status:** ✅ Implemented
**API Key Location:** Environment variable (not exposed in frontend code)

**Features:**
- Device fingerprinting on login
- VPN/Proxy/Tor detection
- Incognito mode detection
- Tampering detection
- Persistent storage in `fingerprintData.json`
- Statistics endpoint: `/api/fingerprint/stats`

**Data Collected:**
- Visitor ID (unique device identifier)
- IP address and geolocation
- OS, browser, device information
- Confidence score
- Security signals (VPN, proxy, Tor, incognito, tampering)

**New Backend Endpoints:**
- `GET /api/fingerprint/config` (auth required) - Get API key securely
- `POST /api/fingerprint` (auth required) - Save fingerprint data
- `GET /api/fingerprint/stats` (auth required) - Get fraud statistics
- `GET /api/fingerprint/data` (auth required) - Get all fingerprint records

**Frontend Integration:**
- API key fetched from backend (not hardcoded)
- Automatic fingerprint collection on successful login
- Data sent to backend for storage and analysis

### Data Storage
**Files:**
- `backend/alertas.json` - Financial data (33K+ records)
- `backend/fingerprintData.json` - Fingerprint/fraud data
- Both files are volume-mounted for persistence

**Fingerprint Data Structure:**
```json
{
  "username": "admin",
  "authenticatedUser": "admin",
  "visitorId": "xxx",
  "ipAddress": "x.x.x.x",
  "ipLocation": {...},
  "os": "Linux",
  "browserName": "Chrome",
  "isVPN": false,
  "isProxy": false,
  "isTor": false,
  "isIncognito": false,
  "isTampered": false,
  "confidence": 0.99,
  "receivedAt": "2025-11-09T..."
}
```

### Environment Variables (Security)
**Required in `backend/.env`:**
```bash
# Authentication
ADMIN_PASSWORD_HASH=$2a$10$3dDoVFA71A88A16QmpfXCeGeoPWHuLBM71kmI.dDD28Fl9K7j0j66

# Fingerprint.com
FINGERPRINT_API_KEY=jYjQeGQ6IPaXsDoIfv0I
```

**Dependencies Added:**
- `bcryptjs@^2.4.3` - Password hashing
- `axios@^1.6.0` - HTTP client (for future proxy features)

## Critical Fixes & Improvements (November 10, 2025)

### 🔴 CRITICAL: Dashboard Reorganization & Data Isolation
**Commit:** `00507ca` - feat(dashboard): Reorganizar abas com isolamento de dados
**Impact:** Complete restructure of dashboard architecture

**Problems Fixed:**
1. **Data Mixing:** Overview tab was showing ALL data mixed together (Performance + Risco)
2. **Filter Confusion:** Single `periodFilter` state was shared across all tabs causing cross-contamination
3. **Performance Issues:** Large datasets caused unnecessary re-renders

**Implementation:**
- Created isolated data computation with `useMemo` for each tab:
  - `performanceFilteredData` → Performance de Produtos only
  - `riscoFilteredData` → Time de Risco only
  - `produtosData` → Casino vs Sportsbook breakdown
  - `bonusData`, `saldoData`, `usuariosData` → Risk metrics
- Each tab now has independent state management
- Filters apply correctly within each tab's scope

**Files Modified:** `src/App.js:700-1100`

---

### 🔴 CRITICAL: Cumulative Values Bug (650% Error!)
**Commits:**
- `e811245` - fix(performance): Corrigir cálculos e adicionar gráficos
- `abd6c24` - fix(performance): CRÍTICO - Corrigir filtro de data com ordenação

**Problem Identified:**
Performance de Produtos reports from Slack contain **CUMULATIVE (day-to-date) values**, NOT incremental values. The code was SUMMING these values, causing massive inflation.

**Example of Bug:**
```javascript
// Slack sends cumulative values:
00:15 → GGR: R$ 1,000 (accumulated since 00:00)
00:30 → GGR: R$ 2,000 (accumulated since 00:00)
01:00 → GGR: R$ 5,000 (accumulated since 00:00)

// ❌ WRONG: Code was summing all values = R$ 8,000
// ✅ CORRECT: Should use only last value = R$ 5,000
```

**Real Impact:**
- User reported: **R$ 97,467.83** (dashboard)
- Slack showed: **R$ 14,992.68** (actual)
- **Error: ~650%!** 🚨

**Root Causes:**
1. **No timestamp sorting:** Code assumed `array[length-1]` was the most recent
2. **Unordered data:** Backend returns data in random order
3. **String date comparison:** "08/11" vs "09/11" sorted alphabetically, not chronologically

**Fixes Implemented:**

#### 1. Timestamp Sorting (App.js:879-885)
```javascript
// CRITICAL: Sort by timestamp BEFORE applying filters
perfData.sort((a, b) => {
  const timeA = new Date(a.timestamp).getTime();
  const timeB = new Date(b.timestamp).getTime();
  return timeA - timeB;
});
```

#### 2. Date-Based Aggregation (App.js:946-970)
```javascript
// Group by date and keep ONLY the last value of each day
const perfDataByDate = {};
perfData.forEach(item => {
  const dateKey = item.data;
  if (!perfDataByDate[dateKey]) {
    perfDataByDate[dateKey] = item;
  } else {
    // Compare timestamps and keep most recent
    const existingTime = new Date(perfDataByDate[dateKey].timestamp).getTime();
    const newTime = new Date(item.timestamp).getTime();
    if (newTime > existingTime) {
      perfDataByDate[dateKey] = item;
    }
  }
});

// Convert back to array with only last values per day
const perfDataLastPerDay = Object.values(perfDataByDate);

// Sort chronologically for charts
perfDataLastPerDay.sort((a, b) => {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
});
```

#### 3. Timestamp-Based Period Filters (App.js:894-933)
```javascript
// Build map: date → most recent timestamp
const dateTimestamps = {};
perfData.forEach(item => {
  const ts = new Date(item.timestamp).getTime();
  if (!dateTimestamps[item.data] || ts > dateTimestamps[item.data]) {
    dateTimestamps[item.data] = ts;
  }
});

// Sort dates by timestamp (NOT alphabetically!)
const sortedDates = Object.keys(dateTimestamps).sort((a, b) => {
  return dateTimestamps[a] - dateTimestamps[b];
});
```

**Results:**
- ✅ "Último Dia Disponível" now shows **R$ 14,992.68** (matches Slack exactly)
- ✅ All period filters respect UTC-3 timezone correctly
- ✅ Percentages in "Comparação de Desempenho" are accurate
- ✅ Values match Slack reports 100%

---

### 📈 New Feature: Performance Tab Time-Series Charts
**Commit:** `e811245` - fix(performance): Corrigir cálculos e adicionar gráficos
**Location:** `src/App.js:3790-3970`

**Problem:** User reported "a Tag produto não mostra nenhum gráfico, apenas cartões com os valores"

**Solution:** Added 3 interactive time-series charts to Performance tab:

1. **💰 GGR Trends - LineChart** (App.js:3808-3858)
   - Casino GGR vs Sportsbook GGR over time
   - Gold line (Casino) vs Purple line (Sportsbook)
   - Dots at each data point for clarity

2. **💎 NGR Trends - AreaChart** (App.js:3861-3921)
   - Casino NGR vs Sportsbook NGR with gradient fills
   - Lime gradient (Casino) vs Blue-Green gradient (Sportsbook)
   - Area charts show volume better than lines

3. **💸 Turnover Comparison - BarChart** (App.js:3924-3968)
   - Side-by-side bars for Casino vs Sportsbook turnover
   - Cyan bars (Casino) vs Blue bars (Sportsbook)
   - Easy visual comparison of betting volume

**Features:**
- Tooltips with formatted currency (R$ X.XXX,XX)
- Y-axis formatted as "R$ Xk" for readability
- Dark mode compatible grid and styling
- Chronological ordering guaranteed by timestamp sort
- Data from `produtosData.rawData` (last value per day)

---

### 🎯 Key Learnings & Best Practices

#### Timezone Handling (UTC-3 / America/Sao_Paulo)
**CRITICAL:** Backend stores dates as strings using `toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })`

**Example:**
```javascript
// Backend (server.js:617)
data: messageTime.toLocaleDateString('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'America/Sao_Paulo'
}) // Returns: "09/11"
```

**Frontend must:**
1. Always sort by `timestamp` field (ISO 8601 string)
2. Never assume array order = chronological order
3. Use `new Date(item.timestamp).getTime()` for comparisons

#### Cumulative vs Incremental Data
**Performance de Produtos:** CUMULATIVE (values accumulate during the day)
**Time de Risco:** INCREMENTAL (new values each report)

**Rule:** Always check if data is cumulative before aggregating. For cumulative data, use ONLY the last value of each period.

#### React Performance Patterns
```javascript
// ✅ ALWAYS use useMemo for expensive calculations
const produtosData = useMemo(() => {
  // Complex aggregation logic
}, [performanceData, periodFilter]);

// ✅ ALWAYS define arrays outside JSX
const chartItems = [...];
{chartItems.map((item, idx) => <div key={idx}>{item}</div>)}

// ❌ NEVER create inline arrays in JSX
{[{label: 'x'}].map(...)} // Causes React Error #31
```

---

### 📊 Updated Metrics
- **Frontend Bundle:** 179.12 kB gzipped (+68 B from fixes)
- **Code Lines:** src/App.js now 4,000+ lines (was 3,526)
- **Charts:** 12+ chart types (added 3 new Performance charts)
- **Data Accuracy:** 100% match with Slack reports (was ~650% error)

## Common Commands

### Development & Testing

```bash
# Build containers locally
docker build -t dashboard-frontend .
docker build -t dashboard-backend ./backend

# Start services
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Test browser rendering (must pass before commits)
node test-browser.js
# ✅ Checks: Header, Cards, Charts, Table
# ❌ Fails on: React errors, Console errors

# Test API (with authentication)
curl http://localhost:3001/api/health
TOKEN=$(curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_PASSWORD"}' | jq -r '.token')
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/dashboard-data | python3 -m json.tool

# Backup critical data before modifications
docker cp dashboard-backend:/app/alertas.json ./backup-data-$(date +%Y%m%d).json
cp src/App.js src/App-backup-$(date +%Y%m%d-%H%M%S).js
cp backend/server.js backend/server-backup-$(date +%Y%m%d-%H%M%S).js

# Update to latest images
docker compose pull
docker compose up -d --force-recreate
```

### Quick Debugging

```bash
# Check container status
docker compose ps

# Restart specific service
docker compose restart backend

# Check if ports are in use
netstat -tulpn | grep -E '80|443|3001'

# View backend data file
docker exec dashboard-backend cat alertas.json | jq '.' | head -n 50

# Check auth token validity
TOKEN="your_token_here"
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/health

# Monitor live logs
docker compose logs -f --tail=100

# Force rebuild and restart
docker compose down
docker compose build --no-cache
docker compose up -d
```

### NPM Scripts

Frontend:
```bash
npm start       # Dev server (port 3000)
npm build       # Production build
npm test        # Jest tests
```

Backend:
```bash
npm start       # Production (node server.js)
npm run dev     # Development (nodemon)
```

## Critical Architecture Details

### Timezone Handling
**All datetime operations MUST use Brasília timezone (UTC-3):**
```javascript
const brasiliaTime = new Date(now.toLocaleString('en-US', {
  timeZone: 'America/Sao_Paulo'
}));
```
Never use `new Date()` directly for business logic.

### React Performance Patterns
**Always use these patterns in App.js:**
```javascript
// ✅ useCallback for functions in useEffect dependencies
const loadData = React.useCallback(async () => {
  // ...
}, []);

// ✅ useMemo for expensive calculations
const chartData = useMemo(() => {
  return data.slice().reverse();
}, [data]);

// ❌ NEVER create inline arrays in JSX
{[{label: 'x'}].map(...)}  // Causes React Error #31

// ✅ Define arrays outside JSX
const items = [{label: 'x'}];
{items.map((item, idx) => <div key={idx}>{item.label}</div>)}
```

### Slack Message Parsing
Two parsers handle different report types:
1. **Performance de Produtos:** GGR Total, NGR Total, Turnover (Casino/Sportsbook split)
2. **Time de Risco:** Deposits, Withdrawals, Unique Players, Bettors, Depositors

Parser converts Brazilian number format (1.234,56) to JS format (1234.56) via `parseBrazilianNumber()`.

### Data Aggregation
`aggregateDataByHour()` in backend/server.js:
- Groups raw messages by hour
- Calculates averages for all metrics
- Returns structured data for charts
- Critical for dashboard performance with 33K+ records

### Docker Volume Persistence
Backend data persists in `backend-data` volume:
```yaml
volumes:
  backend-data:
    driver: local
```
**Important:** Data survives container recreation but NOT `docker compose down -v`

## Deployment Strategies

### Production Architecture
- **Frontend:** Vercel (auto-deploy on git push to main)
- **Backend:** Docker container on VPS/cloud server
- **Data:** Backend volume-mounted `alertas.json` on host server

### Local Development
- **Frontend:** `npm start` (port 3000) OR Docker Nginx (port 80)
- **Backend:** `npm run dev` in backend/ OR Docker (port 3001)
- **Data:** Local `backend/alertas.json`

### Docker Deployment (Full Stack)
```bash
docker compose up -d  # Runs both frontend (Nginx) and backend
```

### Vercel + Docker Hybrid (Production)
1. Backend: Deploy via Docker to server
2. Frontend: Automatically deployed to Vercel via GitHub Actions
3. Configure `vercel.json` with backend server IP
4. Frontend proxies all `/api/*` requests to backend

## File Structure

```
backend/
  server.js              # Main backend (2,355 lines)
  alertas.json          # Data storage (volume-mounted)
  .env                  # SLACK_BOT_TOKEN, CHANNEL_ID (DO NOT COMMIT)
  Dockerfile            # Multi-stage build

src/
  App.js                # Main React component (3,526 lines)
  index.js              # Entry point

.github/workflows/
  deploy-frontend-vercel.yml  # Auto-deploy frontend to Vercel
  ci-backend.yml             # Backend CI (no auto-deploy)

docker-compose.yml      # Production orchestration
nginx.conf              # Reverse proxy + static serving
vercel.json             # Vercel rewrites config (API proxy)
test-browser.js         # Puppeteer validation (MUST pass)
```

## Critical Files (Always Backup First)

- `src/App.js` - Backup exists: `src/App-working-with-charts-backup.js`
- `backend/server.js` - Core backend logic
- `docker-compose.yml` - Service orchestration
- `backend/alertas.json` - Production data (33K+ records)

## Known Issues & Solutions

### Dashboard White Screen
**Cause:** React Error #31 from inline arrays/objects in JSX
**Fix:** Move all array/object definitions outside JSX, use variables
**Restore:** `cp src/App-working-with-charts-backup.js src/App.js && docker build && docker restart dashboard-frontend`

### Login Page Not Showing / Stuck on Loading
**Cause:** Frontend can't reach backend API or CORS issues
**Check:**
1. `curl http://localhost:3001/api/health` - Backend running?
2. Browser console - Check for CORS or network errors
3. `docker logs dashboard-backend` - Check backend logs
**Fix:** Ensure backend is running and CORS is configured properly in server.js

### API 500 Error
**Check:** `docker logs dashboard-backend --tail 100`
**Common:** Missing .env, invalid Slack token, timezone parsing error, invalid JWT token

### Container Won't Start
**Check:** `netstat -tulpn | grep -E '80|443|3001'` for port conflicts
**Fix:** Stop conflicting services or change ports in docker-compose.yml

### Vercel Deploy Works but API Calls Fail
**Cause:** Incorrect backend IP in vercel.json
**Fix:** Update vercel.json with correct backend server IP address
**Verify:** Check Network tab in browser DevTools for API request URLs

## Authentication System

**Location:** `backend/server.js:36-41` (USERS object) and `backend/server.js:45-59` (JWT generation)

**Default Credentials:**
- Username: `admin`
- Password: Hardcoded in USERS object (check server.js:36-41)

**Flow:**
1. POST `/auth/login` with username/password → JWT token
2. Token stored in localStorage
3. All API requests include `Authorization: Bearer <token>` header
4. Token validated via `verifyToken()` middleware (server.js:61-84)
5. Sessions tracked in `activeSessions` Map

**Security Notes:**
- ✅ **SECURE:** Passwords hashed with bcrypt (salt rounds: 10)
- ✅ **SECURE:** API keys stored in environment variables
- ✅ **SECURE:** Fingerprint.com fraud detection enabled
- Token expiration: 24 hours
- To add users: modify USERS object in server.js with password hash
- To change password: Use `node backend/utils/generate-password-hash.js "new_password"`

## API Endpoints (Key)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/auth/login` | Login, get JWT token | No |
| POST | `/auth/logout` | Invalidate token | Yes |
| GET | `/api/health` | Health check | No |
| GET | `/api/dashboard-data` | Aggregated metrics for charts | Yes |
| GET | `/api/data` | Raw stored data | Yes |
| GET | `/api/fetch-messages?days=N` | Manual Slack fetch | Yes |
| GET | `/api/coverage-analysis` | Data quality metrics | Yes |
| POST | `/api/test-parser` | Test parser with custom message | Yes |
| DELETE | `/api/data` | Clear all data | Yes |
| **GET** | **`/api/fingerprint/config`** | **Get Fingerprint API key (secure)** | **Yes** |
| **POST** | **`/api/fingerprint`** | **Save fingerprint data** | **Yes** |
| **GET** | **`/api/fingerprint/stats`** | **Get fraud detection statistics** | **Yes** |
| **GET** | **`/api/fingerprint/data`** | **Get all fingerprint records** | **Yes** |

## Environment Variables

**Backend** (`backend/.env`):
```bash
SLACK_BOT_TOKEN=xoxb-...     # Bot token with channels:history, channels:read
CHANNEL_ID=C09LD4K2GAH       # Slack channel ID
PORT=3001                    # Backend port
NODE_ENV=production          # Environment

# Security (NEW - Nov 2025)
ADMIN_PASSWORD_HASH=$2a$10$...  # bcrypt hash (use generate-password-hash.js)
FINGERPRINT_API_KEY=...         # Fingerprint.com API key
```

**Vercel** (Dashboard → Settings → Environment Variables):
```bash
# No environment variables needed for frontend
# API proxy configured in vercel.json to point to backend IP
```

**Important:** Update `vercel.json` with backend IP before deploying:
```json
{
  "rewrites": [{
    "source": "/api/:path*",
    "destination": "http://YOUR_BACKEND_IP:3001/api/:path*"
  }]
}
```

## Testing Workflow

**Before ANY commit:**
1. Create backup of modified files
2. `docker build -t dashboard-frontend-test .` (frontend changes)
3. `docker build -t dashboard-backend-test ./backend` (backend changes)
4. `node test-browser.js` - MUST show ✅ for all checks
5. Verify no console errors in output
6. Test API with auth:
   ```bash
   # Get token
   TOKEN=$(curl -X POST http://localhost:3001/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"YOUR_PASSWORD"}' | jq -r '.token')

   # Test endpoint
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/dashboard-data
   ```

**Before production deploy:**
1. Backup production data: `docker cp dashboard-backend:/app/alertas.json ./backup.json`
2. Test locally with `docker compose up -d`
3. Monitor logs: `docker compose logs -f --tail 100`
4. Verify health: `curl http://localhost:3001/api/health`
5. Verify Vercel config has correct backend IP

**CI/CD:**
- Frontend: Auto-deploys to Vercel on push to main (GitHub Actions)
- Backend: Manual Docker build/push required

## Prohibited Operations

- ❌ Modify code without backup
- ❌ Commit `.env` files with tokens, API keys, or password hashes
- ❌ **Store plaintext passwords (always use bcrypt hashes)**
- ❌ **Hardcode API keys in frontend code**
- ❌ Create inline arrays/objects in JSX (React Error #31)
- ❌ Remove `useCallback`/`useMemo` from App.js
- ❌ Change timezone without updating all references
- ❌ Modify `aggregateDataByHour()` without validation
- ❌ Delete production `alertas.json` or `fingerprintData.json` without backup
- ❌ Deploy without running `test-browser.js`
- ❌ Modify USERS object without bcrypt password hashes
- ❌ Deploy Vercel with incorrect backend IP in vercel.json
- ❌ **Disable security features (bcrypt, fingerprinting) without authorization**

## Important Metrics

- **Data Coverage:** Historical: 74.6% (Performance), 76.2% (Risco) - Target: 95-100%
- **Uptime:** Target 99%+ (restart: unless-stopped)
- **Bundle Size:** 161KB gzipped (keep under 200KB)
- **API Response:** <100ms target
- **Auto-refresh:** 30s interval (configurable)
- **Slack Rate Limit:** 100 messages per fetch

## Documentation Reference

- `DEVELOPMENT-GUIDELINES.md` - Comprehensive development rules (v1.0.0)
- `README.md` - Quick start and features
- `DEPLOY-PRODUCTION.md` - Production deployment guide
- `DOCKER-README.md` - Docker details
- `API_ENDPOINTS.md` - Full endpoint documentation

## Git Commit Convention

```
type(scope): description

Examples:
feat(frontend): Add filter by report type
fix(backend): Correct timezone to UTC-3
docs(readme): Update deployment instructions
refactor(api): Optimize data aggregation
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
