# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time Slack financial dashboard monitoring system for Domino Tech & Brew. Collects hourly financial reports from Slack, processes metrics (GGR, NGR, Turnover, Deposits, Withdrawals), and displays them via an interactive React dashboard.

**Production:** https://techandbrew.com.br
**Stack:** React 18 + Node.js 18 + Docker + Nginx
**Data:** 33,501+ records in alertas.json (JSON file database)

## Architecture

### Data Flow
```
Slack Channel → Backend Parser → Validation → alertas.json → API Aggregation → Frontend Dashboard
```

### Key Components

**Backend** (`backend/server.js` - 2,201 lines)
- Express API with 25+ endpoints
- Slack Web API integration (@slack/web-api)
- Two message parsers: "Relatório de Performance de Produtos" and "Relatório Time de Risco"
- Hourly data aggregation via `aggregateDataByHour()` function
- **Critical:** All timestamps use America/Sao_Paulo timezone (UTC-3)
- Persistent storage: `alertas.json` (volume-mounted)

**Frontend** (`src/App.js` - 3,170 lines)
- Single-page React app with 4 dashboard views: Performance, Risco, Overview, Anomalias
- Recharts for 8+ chart types (Line, Bar, Area, Pie, Gauge, etc.)
- **Critical:** Must use `useCallback`/`useMemo` to prevent React Error #31
- **Critical:** Never create inline arrays in JSX (causes minified React error)
- Auto-refresh every 30s (optional)
- Dark mode with seguro.bet.br-inspired color palette

**Infrastructure**
- Frontend: Nginx container (port 80, 443) serving React build + reverse proxy to backend
- Backend: Node.js container (port 3001) with restart policy `unless-stopped`
- Health checks: `/api/health` (backend), `http://localhost` (frontend)
- Docker Compose orchestration with `dashboard-network` bridge

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

# Test API
curl http://localhost:3001/api/health
curl http://localhost:3001/api/dashboard-data | python3 -m json.tool

# Backup critical data before modifications
docker cp dashboard-backend:/app/alertas.json ./backup-data-$(date +%Y%m%d).json
cp src/App.js src/App-backup-$(date +%Y%m%d-%H%M%S).js
cp backend/server.js backend/server-backup-$(date +%Y%m%d-%H%M%S).js

# Update to latest images
docker compose pull
docker compose up -d --force-recreate
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

## File Structure

```
backend/
  server.js              # Main backend (2,201 lines)
  alertas.json          # Data storage (volume-mounted)
  .env                  # SLACK_BOT_TOKEN, CHANNEL_ID (DO NOT COMMIT)
  Dockerfile            # Multi-stage build

src/
  App.js                # Main React component (3,170 lines)
  index.js              # Entry point

docker-compose.yml      # Production orchestration
nginx.conf              # Reverse proxy + static serving
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

### API 500 Error
**Check:** `docker logs dashboard-backend --tail 100`
**Common:** Missing .env, invalid Slack token, timezone parsing error

### Container Won't Start
**Check:** `netstat -tulpn | grep -E '80|443|3001'` for port conflicts
**Fix:** Stop conflicting services or change ports in docker-compose.yml

## API Endpoints (Key)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/dashboard-data` | Aggregated metrics for charts |
| GET | `/api/data` | Raw stored data |
| GET | `/api/fetch-messages?days=N` | Manual Slack fetch |
| GET | `/api/coverage-analysis` | Data quality metrics |
| POST | `/api/test-parser` | Test parser with custom message |
| DELETE | `/api/data` | Clear all data |

## Environment Variables

Required in `backend/.env`:
```bash
SLACK_BOT_TOKEN=xoxb-...     # Bot token with channels:history, channels:read
CHANNEL_ID=C09LD4K2GAH       # Slack channel ID
PORT=3001                    # Backend port
NODE_ENV=production          # Environment
```

## Testing Workflow

**Before ANY commit:**
1. Create backup of modified files
2. `docker build -t dashboard-frontend-test .` (frontend changes)
3. `docker build -t dashboard-backend-test ./backend` (backend changes)
4. `node test-browser.js` - MUST show ✅ for all checks
5. Verify no console errors in output
6. Test API: `curl http://localhost:3001/api/dashboard-data`

**Before production deploy:**
1. Backup production data: `docker cp dashboard-backend:/app/alertas.json ./backup.json`
2. Test locally with `docker compose up -d`
3. Monitor logs: `docker compose logs -f --tail 100`
4. Verify health: `curl http://localhost:3001/api/health`

## Prohibited Operations

- ❌ Modify code without backup
- ❌ Commit `.env` files with tokens
- ❌ Create inline arrays/objects in JSX (React Error #31)
- ❌ Remove `useCallback`/`useMemo` from App.js
- ❌ Change timezone without updating all references
- ❌ Modify `aggregateDataByHour()` without validation
- ❌ Delete production `alertas.json` without backup
- ❌ Deploy without running `test-browser.js`

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
