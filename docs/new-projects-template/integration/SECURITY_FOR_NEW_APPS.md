# VPS Security & Deployment Requirements for New Apps

**Purpose:** Hand this to any new app/project so they know exactly what's needed on their end for a fast, secure deploy.  
**VPS Specs:** 2 vCPU, 8GB RAM, 100GB NVMe | Multi-project, multi-environment  
**Last Updated:** 2026-06-08

**Start with:** [VPS_SYSTEM_OVERVIEW.md](VPS_SYSTEM_OVERVIEW.md) for shared vs isolated architecture.  
**Live inventory:** [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md).

---

## TL;DR — What Your App Needs

| Requirement | Details |
|-------------|---------|
| **Dockerfile** | Non-root user, pinned base image, HEALTHCHECK instruction |
| **Health endpoint** | `GET /health` returning JSON with HTTP 200 (or 503 if unhealthy) |
| **`.env.example`** | All env vars documented, no secrets committed |
| **Port** | Use the generator default `4001` unless a non-standard layout documents another internal port |
| **Project name** | Lowercase, hyphens only (e.g. `my-app`, never `MyApp`) |

If you have those 5 things ready, deployment takes minutes.

---

## 1. Network Security (What the VPS Handles)

You don't configure any of this — it's handled server-side. But you should know what's in place:

- **Firewall (UFW):** Default deny incoming. Only ports 22 (SSH), 80 (HTTP), 443 (HTTPS) are open.
- **No direct port exposure:** Your app's port is NEVER exposed to the internet. All traffic goes through the centralized reverse proxy.
- **Network isolation:** Each project gets its own Docker network. Projects cannot communicate with each other. Environments (production, testing, development) are fully isolated.
- **SSL/TLS:** Production and testing use HTTPS with Let's Encrypt certificates (TLS 1.2+ only). Auto-renewed. HSTS headers enforced.
- **Path-based routing:** Your app is accessed at `https://app.graspvisual.com/your-app/` — no client names in subdomains for privacy.

**What this means for you:** Your app only needs to listen on its internal port. It never touches SSL, domain routing, or firewall rules.

---

## 2. Container Security (What Your App Must Do)

### Run as Non-Root User

```dockerfile
# Node.js — use the built-in 'node' user
FROM node:18-alpine
USER node

# Python — create a user
FROM python:3.11-slim
RUN useradd -m -u 1000 appuser
USER appuser
```

**Why:** Root inside a container = root escalation risk. This is mandatory.

### Pin Base Image Versions

```dockerfile
# GOOD
FROM node:18-alpine
FROM python:3.11-slim

# BAD — never use 'latest'
FROM node:latest
FROM python
```

### Use Minimal Base Images

Prefer Alpine or slim variants. Smaller image = smaller attack surface.

### Include a HEALTHCHECK

On **Node.js Alpine**, use `127.0.0.1` (not `localhost`) and a `node` probe — see [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md).

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
```

The VPS health monitoring depends on this. If your container doesn't report healthy, it won't receive traffic.

### Multi-Stage Builds (Recommended)

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force
COPY . .

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app /app
USER node
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
EXPOSE 4001
CMD ["npm", "start"]
```

---

## 3. Secrets Management (Critical)

### Rules

| Do | Don't |
|----|-------|
| Store ALL secrets in environment variables | Hardcode passwords, API keys, or tokens in code |
| Provide a `.env.example` with placeholder values | Commit actual `.env` files to git |
| Use 32+ character random passwords | Use short or predictable passwords |
| Use `openssl rand -base64 32` to generate secrets | Reuse passwords across environments |

### Environment Variable Naming Convention

| Environment | Suffix | Example |
|-------------|--------|---------|
| **Production** | None | `POSTGRES_PASSWORD`, `ADMIN_API_KEY` |
| **Testing** | `_TEST` | `POSTGRES_PASSWORD_TEST`, `ADMIN_API_KEY_TEST` |
| **Development** | `_DEV` | `POSTGRES_PASSWORD_DEV`, `ADMIN_API_KEY_DEV` |

### Required `.env.example` Format

```bash
# === Database Configuration ===
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=my-app_prod
POSTGRES_USER=my-app_user
POSTGRES_PASSWORD=CHANGE_THIS_SECURE_PASSWORD_MIN_32_CHARS

# === Application Configuration ===
APP_ENV=production
APP_URL=https://app.graspvisual.com/my-app
PORT=4001
LOG_LEVEL=INFO
TIMEZONE=America/Chicago

# === API Keys (if applicable) ===
ADMIN_API_KEY=CHANGE_THIS_SECURE_API_KEY_MIN_32_CHARS
```

### What NOT to Put in .env.example

- Real passwords or API keys
- Connection strings with credentials
- Private keys or certificates
- Any value that would be a security risk if leaked

---

## 4. Health Endpoint (Required)

Your app MUST expose a health check endpoint. This is how the VPS monitors your app.

### Specification

| Property | Value |
|----------|-------|
| **Path** | `/health` or `/api/health` |
| **Method** | `GET` |
| **Healthy response** | HTTP 200 |
| **Unhealthy response** | HTTP 503 |
| **Content-Type** | `application/json` |

### Response Format

```json
{
  "status": "healthy",
  "timestamp": "2026-02-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "cache": "connected"
  }
}
```

### What to Check

- **DO check:** Database connection, Redis connection, critical internal dependencies
- **DON'T check:** External third-party APIs (they may be slow/unreliable and cause false unhealthy reports)

### Example Implementations

**Node.js / Express:**
```javascript
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});
```

**Python / FastAPI:**
```python
@app.get("/health")
async def health():
    try:
        await database.execute("SELECT 1")
        return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
```

---

## 5. Available Services (What You Can Use)

| Service | Version | Connection Host | Port | Notes |
|---------|---------|----------------|------|-------|
| **PostgreSQL** | 15-alpine (generator baseline); production hardened: `vps-postgres15:patched` (or 16/17) from Debian digest + `infrastructure/images/postgres/` — [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) | `postgres` | 5432 | Per-project instance in your compose |
| **Redis** | 7-alpine (generator baseline); production hardened: `vps-redis8:patched` from `infrastructure/images/redis8/` — [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) | `redis` | 6379 | Optional, per-project |
| **Reverse Proxy (Caddy)** | Managed | N/A | 80/443 | You do not configure TLS or public ports |
| **Monitoring** | Grafana/Loki/Promtail | Via platform | — | Not per-project; see [../setup/MONITORING.md](../setup/MONITORING.md) |

**Not in active onboarding:** n8n (decommissioned from baseline). See [AVAILABLE_SERVICES.md](AVAILABLE_SERVICES.md).

### NOT Available

MongoDB, Elasticsearch, RabbitMQ, Kafka, GPU compute, Kubernetes. If you need something not listed, ask first — see `docs/integration/AVAILABLE_SERVICES.md`.

---

## 6. Resource Limits (Per Service)

Your app runs on shared infrastructure. Resource limits are enforced via Docker.

| Environment | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|-------------|-----------|-------------|-------------|----------------|
| **Production** | 0.5 cores | 1 GB | 0.2 cores | 512 MB |
| **Testing** | 0.3 cores | 512 MB | 0.1 cores | 256 MB |
| **Development** | 0.2 cores | 256 MB | 0.05 cores | 128 MB |

**Example:** An app with API + PostgreSQL + Redis in production gets up to 1.5 cores and 3 GB RAM total.

Design your app to work within these limits. If you need more, discuss before deploying.

---

## 7. Naming Conventions (Must Follow Exactly)

| Item | Format | Example |
|------|--------|---------|
| Project name | lowercase-hyphens | `my-app` |
| Container name | `{project}-{service}-{env}` | `my-app-api-prod` |
| Network name | `{project}-{env}-network` | `my-app-prod-network` |
| Volume name | `{project}-{service}-{env}` | `my-app-postgres-prod` |
| Database name | `{project}_{env}` | `my_app_prod` |
| Database user | `{project}_user` | `my_app_user` |

**Environment abbreviations (hardcoded, never change):**
- Production = `prod` (NOT `production`)
- Testing = `test` (NOT `testing`)
- Development = `dev` (NOT `development`)

---

## 8. Logging Standards

| Rule | Details |
|------|---------|
| Output to stdout/stderr | Docker captures logs automatically |
| Use structured logging | JSON format preferred |
| Include context | Request ID, user ID, timestamps |
| NEVER log secrets | No passwords, tokens, API keys, or PII in logs |
| Use log levels | DEBUG, INFO, WARNING, ERROR, CRITICAL |

```json
{
  "timestamp": "2026-02-15T10:30:00Z",
  "level": "INFO",
  "service": "api",
  "message": "Request processed",
  "request_id": "abc123"
}
```

---

## 9. Database Security

| Rule | Details |
|------|---------|
| Use parameterized queries | **Mandatory** — prevents SQL injection |
| Use connection pooling | Don't open/close connections per request |
| Use migrations | Never modify schema directly on the server |
| Test migrations locally first | Before deploying to any VPS environment |
| Handle connection errors gracefully | Retry logic, don't crash on transient failures |

---

## 10. API Security Standards

| Rule | Details |
|------|---------|
| Use HTTPS | Handled by reverse proxy, but your API URLs should reference `https://` |
| Return proper status codes | 401 for auth failures, 403 for forbidden, not 200 with error body |
| Validate all input | Never trust client data |
| Rate limiting | Reverse proxy provides baseline rate limiting; add app-level if needed |
| CORS | Configure for your specific frontend origin, not `*` in production |
| No sensitive data in URLs | Tokens, passwords, PII should be in headers or body, never query strings |

---

## 11. What to Provide for Deployment

When your app is ready, give the VPS administrator these 7 items:

1. **Project name** — lowercase, hyphens (e.g., `my-app`)
2. **Services needed** — PostgreSQL, Redis, or another explicitly deployed dependency (which ones?)
3. **Application port** — what port does your app listen on internally (generator default: 4001)
4. **URL path prefix** — what path should route to your app (e.g., `/my-app/`)
5. **Environment variables** — your `.env.example` file
6. **Build context** — where is your Dockerfile (usually project root)
7. **Target environment** — start with production only, add testing/dev later

---

## 12. Pre-Deploy Checklist

Run through this before requesting deployment:

```
- [ ] Project name is lowercase-hyphens
- [ ] Dockerfile uses non-root user
- [ ] Dockerfile has pinned base image version (not 'latest')
- [ ] Dockerfile includes HEALTHCHECK instruction
- [ ] Health endpoint exists at /health or /api/health
- [ ] Health endpoint returns 200 JSON when healthy, 503 when unhealthy
- [ ] .env.example exists with all variables documented (no real secrets)
- [ ] No secrets hardcoded anywhere in the codebase
- [ ] Passwords are 32+ characters (will be generated at deploy time)
- [ ] App listens on a single internal port
- [ ] Logs go to stdout/stderr (not files)
- [ ] No sensitive data in logs
- [ ] Database queries use parameterized statements
- [ ] README.md has setup instructions and API docs
- [ ] package-lock.json committed (if Node.js using npm ci)
```

If all boxes are checked, you're ready. Deployment on the VPS side takes ~5 minutes.

---

## Quick Reference Card

```
Domain:         app.graspvisual.com (production)
                app-test.graspvisual.com (testing)
                app-dev.graspvisual.com (development)

Your app URL:   https://app.graspvisual.com/{your-project}/

SSL:            Handled by VPS (Let's Encrypt, TLS 1.2+, HSTS)
Firewall:       UFW — only 22, 80, 443 open
Routing:        Centralized reverse proxy (Caddy)
Isolation:      Separate Docker network per project per environment
Secrets:        .env files, never committed, 32+ char passwords
Health check:   GET /health → 200 JSON required
Non-root:       Mandatory in Dockerfile
```

---

**Questions?** Read [VPS_SYSTEM_OVERVIEW.md](VPS_SYSTEM_OVERVIEW.md), then [SHOULD_I_USE_VPS.md](SHOULD_I_USE_VPS.md) and [ADDING_NEW_PROJECTS.md](ADDING_NEW_PROJECTS.md).
