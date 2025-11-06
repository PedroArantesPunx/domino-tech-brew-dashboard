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

**Backend** (`backend/server.js` - 2,355 lines)
- Express API with 25+ endpoints
- JWT authentication with hardcoded credentials (USERS object in server.js:36-41)
- Slack Web API integration (@slack/web-api)
- Two message parsers: "Relatório de Performance de Produtos" and "Relatório Time de Risco"
- Hourly data aggregation via `aggregateDataByHour()` function
- **Critical:** All timestamps use America/Sao_Paulo timezone (UTC-3)
- Persistent storage: `alertas.json` (volume-mounted)

**Frontend** (`src/App.js` - 3,526 lines)
- Single-page React app with 4 dashboard views: Performance, Risco, Overview, Anomalias
- Login screen with JWT token management (localStorage)
- Recharts for 8+ chart types (Line, Bar, Area, Pie, Gauge, etc.)
- **Critical:** Must use `useCallback`/`useMemo` to prevent React Error #31
- **Critical:** Never create inline arrays in JSX (causes minified React error)
- Auto-refresh every 30s (optional)
- Dark mode with seguro.bet.br-inspired color palette

**Infrastructure**
- Frontend: Dual deployment - Vercel (production) + Nginx container (local/testing)
- Backend: Node.js container (port 3001) with restart policy `unless-stopped`
- Health checks: `/api/health` (backend), `http://localhost` (frontend)
- Docker Compose orchestration with `dashboard-network` bridge
- CI/CD: GitHub Actions deploy frontend to Vercel on push to main

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
- Credentials hardcoded in server.js (not production-ready)
- No password hashing (plain text comparison)
- Token expiration: 24 hours
- To add users: modify USERS object in server.js

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

## Environment Variables

**Backend** (`backend/.env`):
```bash
SLACK_BOT_TOKEN=xoxb-...     # Bot token with channels:history, channels:read
CHANNEL_ID=C09LD4K2GAH       # Slack channel ID
PORT=3001                    # Backend port
NODE_ENV=production          # Environment
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
- ❌ Commit `.env` files with tokens or hardcoded passwords
- ❌ Create inline arrays/objects in JSX (React Error #31)
- ❌ Remove `useCallback`/`useMemo` from App.js
- ❌ Change timezone without updating all references
- ❌ Modify `aggregateDataByHour()` without validation
- ❌ Delete production `alertas.json` without backup
- ❌ Deploy without running `test-browser.js`
- ❌ Modify USERS object without understanding auth implications
- ❌ Deploy Vercel with incorrect backend IP in vercel.json

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
