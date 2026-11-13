# VPS Troubleshooting Guide

**Last Updated:** 2026-10-31  
**Purpose:** Comprehensive guide for diagnosing and fixing common VPS deployment issues

**Reverse proxy reference:** [../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md)  
**Git pull safety:** [`GIT_PULL_SAFETY.md`](/vps/docs/maintenance/GIT_PULL_SAFETY.md)

---

## Quick Reference

| Issue | Quick Fix | Full Solution |
|-------|-----------|--------------|
| DNS resolution fails | Restart reverse proxy | [Issue #1](#1-dns-resolution-failures) |
| Containers not starting | Check env files | [Issue #2](#2-container-deployment-failures) |
| Env variables not loading | Verify naming | [Issue #3](#3-environment-variable-loading-issues) |
| Wrong database user | Check .env vs env_file | [Issue #3.1](#31-docker-compose-env-file-override) |
| License key missing in container | Remove compose `environment:` overrides | [Issue #3.2](#32-compose-environment-block-overrides-env_file) |
| Redis unhealthy / NOAUTH | Use `$$REDIS_PASSWORD` in command/healthcheck | [Issue #3.3](#33-redis-password-compose-interpolation) |
| SVC license check 401 | Regenerate app API key in SVC admin | [Issue #13](#13-svc-license-check-returns-401) |
| Git conflicts | Stash; never reset --hard on live VPS | [Issue #4](#4-git-conflicts) |
| Git pull wiped Caddy/compose | Restore from running container; do not restart Caddy | [Issue #14](#14-git-pull-wiped-live-vps-files) |
| Script permission denied | `chmod +x script.sh` | [Issue #5](#5-script-permission-issues) |
| SSL certificate errors | Copy certificates | [Issue #6](#6-ssl-certificate-path-issues) |
| Network subnet conflict | Change subnet range | [Issue #7](#7-network-subnet-conflicts) |
| Dockerfile build fails | Check user/GID | [Issue #8](#8-dockerfile-issues) |
| Reverse-proxy config errors | Verify upstreams | [Issue #9](#9-reverse-proxy-configuration-errors) |
| Health checks failing | Check endpoint | [Issue #10](#10-container-health-check-failures) |

---

## Diagnostic Tools

Before troubleshooting manually, run the diagnostic script:

```bash
/vps/scripts/diagnose-issues.sh
```

This will automatically detect common issues and provide solutions.

---

## Detailed Issue Documentation

### 1. DNS Resolution Failures

**Symptoms:**
- `host not found in upstream "project-api-prod"` in reverse-proxy logs
- `wget: bad address 'project-api-prod:4001'` when testing from the reverse-proxy container
- `project-api-prod could not be resolved (2: Server failure)`
- 502 Bad Gateway errors when accessing endpoints

**Root Causes:**
1. Containers not on shared environment networks
2. Reverse-proxy container still has stale DNS state after container deployment
3. Upstream name in `Caddyfile` does not match the service/container name
4. Containers started before the reverse proxy can resolve them

**Solutions:**

**Solution 1: Verify Network Membership**
```bash
# Check if API container is on correct networks
docker inspect project-api-prod | grep -A 10 Networks

# Should show both:
# - project-prod-network (project internal)
# - production-network (for reverse-proxy access)

# If missing production-network, update docker-compose.yml:
# networks:
#   - project-prod-network
#   - production-network  # <-- This must be present
```

**Solution 2: Restart Reverse Proxy**
```bash
cd /vps/infrastructure/reverse-proxy
docker compose restart caddy
sleep 5
```

**Solution 3: Verify DNS Resolution**
```bash
# Test from reverse-proxy container
docker exec vps-reverse-proxy ping -c 1 project-api-prod

# Should succeed. If not, check networks again.
```

**Prevention:**
- ✅ Deploy script automatically restarts the reverse proxy after deployment
- ✅ Templates include correct dual-network configuration
- ✅ Verification script checks network membership

**Related Files:**
- `scripts/deploy.sh` - Automatically handles this
- `environments/*/projects/*/docker-compose.yml` - Network configuration
- `infrastructure/reverse-proxy/Caddyfile` - Upstream routing configuration

---

### 2. Container Deployment Failures

**Symptoms:**
- Containers missing: `docker ps` shows no containers
- `docker ps -a` shows exited/stopped containers
- Deployment script completes but containers don't start

**Root Causes:**
1. Containers not deployed (deploy script not run)
2. Build failures (Dockerfile errors, missing files)
3. Environment variable issues (missing or incorrect values)
4. Resource constraints (not enough CPU/memory)

**Solutions:**

**Solution 1: Check Container Status**
```bash
# List all containers (including stopped)
docker ps -a | grep project-name

# Check exit codes
docker inspect project-api-prod | grep ExitCode
```

**Solution 2: Check Build Logs**
```bash
cd /vps/environments/production/projects/project-name
docker compose logs api
```

**Solution 3: Verify Environment Variables**
```bash
# Check key presence without printing secret values
cd /vps/environments/production/projects/project-name
grep -E '^[A-Z0-9_]+=' env.production | sed 's/=.*/=***REDACTED***/'

# Verify no placeholder values
grep "CHANGE_THIS" env.production

# Verify runtime values after deploy
/vps/scripts/verify-runtime-secrets.sh production
```

**Solution 4: Check Resource Availability**
```bash
# Check Docker resource usage
docker stats --no-stream

# If resources exhausted, adjust limits in docker-compose.yml
```

**Prevention:**
- ✅ Deploy script includes instrumentation and error reporting
- ✅ Env file validation before deployment
- ✅ Templates have correct resource limits

**Related Files:**
- `scripts/deploy.sh` - Deployment with error handling
- `environments/*/projects/*/env.*` - Environment variables
- `scripts/check-env-files.sh` - Env file validation

---

### 3. Environment Variable Loading Issues

**Symptoms:**
- `variable is not set` warnings in docker compose
- Containers fail with missing environment variables
- Services can't connect to database

**Root Causes:**
1. Env file not loaded (missing `env_file` directive)
2. Wrong variable names (suffix mismatch)
3. Env file not in correct location
4. Variables not exported for Docker Compose substitution

**Solutions:**

**Solution 1: Verify env_file Directive**
```yaml
# In docker-compose.yml, ensure this exists:
services:
  api:
    env_file:
      - env.production  # Must match environment
```

**Solution 2: Check Variable Naming**
```bash
# Production: NO suffix
POSTGRES_PASSWORD=...
ADMIN_API_KEY=...

# Testing: _TEST suffix
POSTGRES_PASSWORD_TEST=...
ADMIN_API_KEY_TEST=...

# Development: _DEV suffix
POSTGRES_PASSWORD_DEV=...
ADMIN_API_KEY_DEV=...
```

**Solution 3: Verify Env File Location**
```bash
# Env file must be in project directory
ls -la /vps/environments/production/projects/project-name/env.production

# Should exist and be readable
```

**Prevention:**
- ✅ Templates have correct `env_file` directives
- ✅ Verification script checks env files
- ✅ Deploy script validates env files before deployment

**Related Files:**
- `environments/*/projects/*/docker-compose.yml` - env_file directives
- `environments/*/projects/*/env.*` - Environment variable files
- `scripts/verify-all-projects.sh` - Env file validation

---

### 3.1. Docker Compose .env File Override Issue

**⚠️ CRITICAL:** This is a common issue that can cause wrong database users, incorrect passwords, or other configuration problems.

**Symptoms:**
- Database connection fails with wrong user (e.g., `postgres` instead of `project_user`)
- Environment variables have wrong values despite `env.production` being correct
- Containers use placeholder/default values instead of actual values
- `POSTGRES_USER=postgres` when it should be `POSTGRES_USER=project_user`

**Root Cause:**
Docker Compose automatically loads `.env` files **before** `env_file` directives. If a `.env` file exists in the project directory, its values will override values from `env.production`, `env.testing`, or `env.development`.

**Example Problem:**
```bash
# .env file (old/placeholder values)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=placeholder

# env.production (correct values)
POSTGRES_USER=etp_user
POSTGRES_PASSWORD=actual-secure-password

# Result: Docker Compose uses .env values, ignoring env.production!
```

**Solutions:**

**Solution 1: Sync .env with env.production (Recommended)**
```bash
# Copy env.production to .env to keep them in sync
cd /vps/environments/production/projects/project-name
cp env.production .env

# Verify they match
diff env.production .env
```

**Solution 2: Remove .env File (If Not Needed)**
```bash
# If you only want to use env.production, remove .env
cd /vps/environments/production/projects/project-name
rm .env

# Note: Docker Compose will still auto-load .env if it exists
```

**Solution 3: Use Only env_file (No .env)**
```bash
# Ensure docker-compose.yml uses env_file, not .env
# Remove any .env file from project directory
# Docker Compose will use env_file values only
```

**How to Diagnose:**
```bash
# Check if .env exists
ls -la /vps/environments/production/projects/project-name/.env

# Compare .env and env.production
diff /vps/environments/production/projects/project-name/.env \
     /vps/environments/production/projects/project-name/env.production

# Check what Docker Compose sees
cd /vps/environments/production/projects/project-name
docker compose config | grep POSTGRES_USER
```

**Prevention:**
- ✅ **Always keep .env and env.production in sync** (if .env exists)
- ✅ **Or remove .env** if you only want to use env_file
- ✅ **Verify values match** before deployment
- ✅ **Check docker compose config** to see what values will be used

**Best Practice:**
When creating a new project:
1. Create `env.production` with correct values
2. If `.env` exists, copy `env.production` to `.env` to sync them
3. Or remove `.env` if not needed
4. Verify with `docker compose config` before deploying

**Related Files:**
- `environments/*/projects/*/.env` - Auto-loaded by Docker Compose
- `environments/*/projects/*/env.production` - Loaded via env_file directive
- `environments/*/projects/*/docker-compose.yml` - env_file configuration

---

### 3.2. Compose `environment:` Block Overrides `env_file`

**Symptoms:**
- `LICENSE_SERVER_APP_API_KEY` is set in `env.production` but `docker exec <api-container> sh -c 'echo $LICENSE_SERVER_APP_API_KEY'` is empty
- Product → SVC license check returns **401** `INVALID_API_KEY` despite a key in `env.production`
- Other secrets from `env_file` are missing while compose `environment:` vars are present

**Root Cause:**
Docker Compose merges `env_file` first, then applies the service `environment:` block. Entries like `LICENSE_SERVER_APP_API_KEY: ${LICENSE_SERVER_APP_API_KEY:-}` are substituted from the **host shell** at compose parse time. If the variable is unset on the host, Compose injects an **empty string**, overriding the value from `env_file`.

**Example (fixed in growplan production compose — API service):**
```yaml
# BAD — overrides env.production with empty host value
environment:
  LICENSE_SERVER_APP_API_KEY: ${LICENSE_SERVER_APP_API_KEY:-}

# GOOD — license vars live only in env.production (env_file)
environment:
  LOG_LEVEL: ${LOG_LEVEL:-INFO}
  # REDIS_URL, LICENSE_SERVER_* — set in env.production (env_file)
```

**Example (fixed in etp production compose, 2026-06-07 — Postgres service):**
```yaml
# BAD — unset host POSTGRES_PASSWORD injects empty string, clearing env_file
environment:
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

# BAD — bare ${JWT_SECRET} also injects empty string when host shell lacks the var
environment:
  JWT_SECRET: ${JWT_SECRET}

# GOOD — DB password only in env.production (env_file)
environment:
  POSTGRES_DB: ${POSTGRES_DB:-etp_prod}
  POSTGRES_USER: ${POSTGRES_USER:-etp_user}
  # POSTGRES_PASSWORD — set in env.production only
```

**Same fix applied to growplan production compose (2026-06-07):** remove `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` from the postgres service; keep password in `env.production` only.

**GrowPlan API fix (2026-06-07):** removed `JWT_SECRET`, `SESSION_SECRET`, `NCDC_API_KEY`, and `USDA_API_KEY` from compose `environment:` — bare `${VAR}` was clearing `env_file` values when `docker compose` ran without a sourced shell env. Verify with `/vps/scripts/verify-runtime-secrets.sh`.

**SVC app keys with `$` in the value:** bcrypt/base64 keys often include `$`. In `env.production`, use **single quotes** (`LICENSE_SERVER_APP_API_KEY='...'`) so `source env.production` does not expand `$` as shell variables. Storing the bcrypt **hash** from SVC `apps.api_key` instead of the plain key returned at registration/regenerate also causes 401 — use the one-time plain key only.

**Solutions:**

```bash
# 1. Confirm the key exists in env_file (redacted)
grep '^LICENSE_SERVER_APP_API_KEY=' environments/production/projects/<project>/env.production | sed 's/=.*/=***/'

# 2. Check what the container actually received
docker exec <api-container> sh -c 'test -n "$LICENSE_SERVER_APP_API_KEY" && echo set || echo missing'

# 3. Remove LICENSE_SERVER_* from compose environment: block; recreate API container
cd /vps/environments/production/projects/<project>
docker compose up -d api
```

**Prevention:**
- Keep app-scoped SVC keys only in `env.production` (via `env_file`), not in compose `environment:` unless the host always exports them
- Run `docker compose config` and inspect the merged `environment` for empty overrides

**Reference:** `/vps/environments/production/projects/growplan/docker-compose.yml` (api + postgres services); `/vps/environments/production/projects/etp/docker-compose.yml` (postgres service)

---

### 3.3. Redis Password Compose Interpolation (`$$REDIS_PASSWORD`)

**Symptoms:**
- `growplan-redis-prod` (or other hardened Redis) stuck **unhealthy** or restart loop
- Redis logs show `NOAUTH` or `requirepass` with empty password
- Healthcheck fails: `redis-cli` cannot authenticate

**Root Cause:**
In compose `command` and `healthcheck`, a single `$REDIS_PASSWORD` is expanded by Compose from the **host shell** at parse time (often empty). The password must be read **inside the container** from `env_file` at runtime.

**Fix (growplan pattern):**
```yaml
command:
  - sh
  - -c
  - |
    exec redis-server ... --requirepass "$$REDIS_PASSWORD" ...
healthcheck:
  test: ["CMD-SHELL", "REDISCLI_AUTH=$$REDIS_PASSWORD redis-cli --tls --cacert /tls/server.crt ping | grep -q PONG"]
env_file:
  - env.production
```

Use `$$` so Compose passes a literal `$REDIS_PASSWORD` to the shell running inside the container.

**Verify:**
```bash
docker inspect growplan-redis-prod --format '{{json .Config.Healthcheck}}' | python3 -m json.tool
docker exec growplan-redis-prod sh -c 'REDISCLI_AUTH=$REDIS_PASSWORD redis-cli --tls --cacert /tls/server.crt ping'
```

**Related:** [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md)

---

### 4. Git Conflicts

**Symptoms:**
- `error: Your local changes to the following files would be overwritten by merge`
- `fatal: pathspec 'file' did not match any files`
- Merge conflicts when pulling updates

**Root Causes:**
1. Local changes not committed
2. Files modified in both local and remote
3. Working directory not clean

**Solutions:**

**Solution 1: Stash Local Changes**
```bash
# Save local changes temporarily
git stash

# Pull updates
git pull

# Reapply local changes
git stash pop

# Resolve any conflicts manually
```

**Solution 2: Do not discard live VPS files**

On this host, `git reset --hard` and `git checkout -- Caddyfile` restore `main`, which may **not** include live site blocks. `git clean -fd` deletes untracked compose/env files. Do not use those commands to "fix" a pull. Follow [`GIT_PULL_SAFETY.md`](/vps/docs/maintenance/GIT_PULL_SAFETY.md) and [Issue #14](#14-git-pull-wiped-live-vps-files).

If you only need to drop edits to a **non-live** tracked file (script, doc):

```bash
git status
git diff -- path/to/file > /tmp/vps-local-changes.patch
# Only restore files you confirmed are not Caddyfile, compose, or env
git restore -- path/to/file
```

**Prevention:**
- ✅ Pull app repos under `/vps/projects/<name>`, not `/vps`, for site updates
- ✅ Stash or commit infra edits before pulling `uhaop/vps`
- ✅ Compare disk Caddyfile to `docker exec vps-reverse-proxy cat /etc/caddy/Caddyfile` before any restart

---

### 5. Script Permission Issues

**Symptoms:**
- `Permission denied` when running scripts
- `bash: ./script.sh: Permission denied`

**Root Causes:**
1. Script not executable
2. Wrong file permissions

**Solutions:**

**Solution 1: Make Script Executable**
```bash
chmod +x /vps/scripts/script-name.sh
```

**Solution 2: Verify Permissions**
```bash
ls -la /vps/scripts/script-name.sh
# Should show: -rwxr-xr-x (executable)
```

**Prevention:**
- ✅ Scripts should be executable when committed
- ✅ Use `chmod +x` when creating new scripts

---

### 6. SSL Certificate Path Issues

**Symptoms:**
- `Error: loading tls certificate` or `tls: failed to find certificate`
- `BIO_new_file() failed` (legacy OpenSSL messages in logs)
- Reverse proxy won't start

**Root Causes:**
1. Certificate files missing
2. Wrong certificate paths in the reverse-proxy config
3. Certificate files not readable

**Solutions:**

**Solution 1: Verify Certificate Files**
```bash
# Check if certificates exist
ls -la /vps/infrastructure/reverse-proxy/ssl/domain-name/

# Should show:
# - fullchain.pem
# - privkey.pem
```

**Solution 2: Create Placeholder Certificates**
```bash
# Run setup script to create placeholder certificates
/vps/scripts/setup-ssl-certificates.sh
```

**Solution 3: Obtain Real Certificates**
```bash
# After DNS is configured
/vps/infrastructure/reverse-proxy/scripts/certbot-auto.sh domain-name
# Multi-domain: certbot-auto.sh primary-domain additional-domain ...
# TasQuantum apex+www: /vps/scripts/setup-tasquantum-ssl.sh
```

**Prevention:**
- ✅ Setup script creates placeholder certificates
- ✅ Certificates obtained after DNS configuration
- ✅ Reverse-proxy config uses correct paths

---

### 7. Network Subnet Conflicts

**Symptoms:**
- `Error response from daemon: Pool overlaps with other one on this address space`
- Containers can't start due to network conflicts

**Root Causes:**
1. Subnet ranges overlap between projects
2. Subnet already in use

**Solutions:**

**Solution 1: Change Subnet Range**
```yaml
# In docker-compose.yml, change subnet:
networks:
  project-prod-network:
    ipam:
      config:
        - subnet: 172.20.X.0/24  # Change X to unused number
```

**Solution 2: Check Existing Subnets**
```bash
# List all Docker networks
docker network ls

# Inspect network to see subnet
docker network inspect network-name | grep Subnet
```

**Prevention:**
- ✅ Use sequential project numbers for subnets
- ✅ Document subnet allocation
- ✅ Templates use project numbers for subnets

---

### 8. Dockerfile Issues

**Symptoms:**
- Build fails with user/GID errors
- `useradd: UID 1000 is not available`
- Permission denied errors

**Root Causes:**
1. User ID conflicts
2. Group ID conflicts
3. Missing dependencies

**Solutions:**

**Solution 1: Use Base Image's Built-in User**
```dockerfile
# Instead of creating new user, use base image's user
FROM node:18-alpine
USER node  # Built-in non-root user
```

**Solution 2: Check Existing Users**
```bash
# Check what UIDs are in use
docker run --rm alpine id
```

**Prevention:**
- ✅ Use base image's built-in non-root user
- ✅ Avoid creating custom users when possible
- ✅ Test Dockerfile builds before deployment

---

### 9. Reverse-Proxy Configuration Errors

**Symptoms:**
- `Error: adapting config using caddyfile adapter` (Caddy validate failure)
- `caddy validate` exits non-zero
- Reverse proxy won't start or restart cleanly

**Root Causes:**
1. Syntax errors in `Caddyfile`
2. Missing `reverse_proxy` upstream definitions
3. Invalid directives
4. Missing `GRAFANA_EDGE_PASSWORD` in reverse-proxy `.env` (required for `/grafana/*` basic_auth)

**Solutions:**

**Solution 1: Validate Caddy Config**
```bash
/vps/scripts/ensure-reverse-proxy-env.sh
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
# Offline / CI:
/vps/scripts/ci/validate-caddyfile.sh
```

**Solution 2: Check Config Syntax and Logs**
```bash
cd /vps/infrastructure/reverse-proxy
docker compose logs caddy | tail -30
docker logs vps-reverse-proxy 2>&1 | tail -30
```

**Solution 3: Verify Upstream Names and Routes**
```bash
grep -n "reverse_proxy" /vps/infrastructure/reverse-proxy/Caddyfile
/vps/scripts/verify-caddy-routes.sh
```

**Prevention:**
- ✅ Test config before reloading
- ✅ Use templates for consistency
- ✅ Verify container names match
- ✅ Bootstrap Grafana edge credentials: `/vps/scripts/ensure-reverse-proxy-env.sh`

---

### 10. Hardened Base Image Issues (Postgres / Redis / Grafana)

**Symptoms:**
- Production DB not on `vps-postgres*:patched` or Redis not on `vps-redis8:patched`
- `validate-hardened-images.sh` reports digest / `BASE_IMAGE` mismatch
- Orphan `grafana/grafana:*` container running alongside `vps-grafana`
- Redis restart loop after image rebuild (`requirepass` config errors) — often missing `--env-file env.production` on `docker compose up`

**Solutions:**

```bash
bash /vps/scripts/ci/validate-hardened-images.sh
bash /vps/scripts/ci/test-hardened-images-smoke.sh
bash /vps/scripts/rebuild-production-images-for-cve-refresh.sh
cd /vps/environments/production/projects/<project>
docker compose --env-file env.production -f <compose-file> up -d
```

Full reference: [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md).

---

### 11. Monitoring Stack Issues (Grafana / Loki / Promtail)

**Symptoms:**
- `401` at `https://app.graspvisual.com/grafana/` (expected without edge credentials)
- Grafana login fails after passing Caddy edge auth
- No logs in Grafana Explore
- `health-check.sh` reports monitoring boundary or ingestion failures

**Root Causes:**
1. Missing or placeholder `GRAFANA_EDGE_PASSWORD` in `infrastructure/reverse-proxy/.env`
2. Missing or placeholder `GRAFANA_ADMIN_PASSWORD` in `infrastructure/monitoring/.env`
3. Grafana not restarted after admin password change
4. Promtail not running or misconfigured
5. Grafana incorrectly attached to `production-network` (internal bypass of edge auth)

**Solutions:**

**Solution 1: Bootstrap credentials**
```bash
/vps/scripts/ensure-reverse-proxy-env.sh
/vps/scripts/ensure-monitoring-env.sh
cd /vps/infrastructure/reverse-proxy && docker compose restart caddy
cd /vps/infrastructure/monitoring && docker compose restart grafana
```

**Solution 2: Verify stack health and log ingestion**
```bash
cd /vps/infrastructure/monitoring
docker compose ps
docker compose logs promtail | tail -30
docker exec vps-grafana wget -qO- http://loki:3100/loki/api/v1/labels
/vps/scripts/ci/test-monitoring-boundary.sh
```

**Solution 3: Query logs in Grafana Explore**
```logql
{job="docker", container="etp-api-prod"}
{job="docker", container="vps-reverse-proxy"}
```

Full ops reference: [../setup/MONITORING.md](../setup/MONITORING.md).

**Prevention:**
- ✅ Run `ensure-monitoring-env.sh` before first monitoring stack start
- ✅ After network or compose changes, run `test-monitoring-boundary.sh`
- ✅ Use internal health checks in `health-check.sh`, not unauthenticated public `/grafana/api/health` curls

---

### 12. Container Health Check Failures

**Symptoms:**
- Containers show as "unhealthy" in `docker ps`
- Health checks fail repeatedly
- Services appear down despite running

**Root Causes:**
1. Health check endpoint not implemented
2. Wrong health check path
3. Health check too strict
4. Service not ready when health check runs

**Solutions:**

**Solution 1: Verify Health Endpoint**
```bash
# Test health endpoint from container
docker exec container-name wget -qO- http://localhost:4001/health

# Should return 200 OK
```

**Solution 2: Check Health Check Configuration**
```yaml
# In docker-compose.yml, verify health check:
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

**Solution 3: Adjust Health Check Timing**
```yaml
# If service takes time to start, increase interval/retries
healthcheck:
  interval: 60s  # Check less frequently
  timeout: 20s  # Allow more time
  retries: 5    # Retry more times
```

**Prevention:**
- ✅ Implement health check endpoint
- ✅ Test health endpoint locally
- ✅ Configure appropriate timeouts

---

### 13. SVC License Check Returns 401

**Symptoms:**
- Product backend logs license-server errors; SVC returns `{"error":{"code":"INVALID_API_KEY","message":"Invalid API key"}}`
- `curl` from product container to `http://svc-api-prod:4001/api/license/...` with headers returns **401**
- Key was rotated or regenerated in SVC but product env was not updated

**Root Causes:**
1. Stale `LICENSE_SERVER_APP_API_KEY` in product `env.production` (key regenerated in SVC admin without redeploying the product)
2. Compose `environment:` block overriding `env_file` with empty value — see [§3.2](#32-compose-environment-block-overrides-env_file)
3. `X-App-ID` does not match the SVC registered `app_id` (e.g. `timekeeper` vs `gv-timekeeper`)

**Solutions:**

**Solution 1: Regenerate key in SVC and update product env**
1. SVC admin → App Details → **API** tab → **Regenerate API Key** (or `POST /api/admin/apps/<appId>/regenerate-api-key` with master admin key)
2. Copy the one-time `api_key` into `/vps/environments/production/projects/<project>/env.production` as `LICENSE_SERVER_APP_API_KEY`
3. Recreate the product API container: `docker compose up -d api`

**Solution 2: Verify live wiring**
```bash
docker exec <product-api> sh -c 'test -n "$LICENSE_SERVER_APP_API_KEY" && echo key=set'
docker exec <product-api> node -e "
const http=require('http');
const key=process.env.LICENSE_SERVER_APP_API_KEY;
const appId=process.env.LICENSE_SERVER_APP_ID||process.env.GROWPLAN_APP_ID||process.env.GV_APP_ID;
const req=http.request({hostname:'svc-api-prod',port:4001,path:'/api/license/test%40example.com',headers:{'X-App-ID':appId,'X-API-Key':key}},r=>{console.log('status',r.statusCode);});
req.end();
"
```
Expect **200** (or **404** for unknown email — not 401).

**Registered production apps (reference):** `growplan`, `timekeeper`, `etp`

**Related:** [LICENSING_AND_STORE_INTEGRATION.md](../integration/LICENSING_AND_STORE_INTEGRATION.md), [projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md](../../projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md)

---

### 14. Git pull wiped live VPS files

**Symptoms:**
- `docker-compose.yml` missing under `environments/production/projects/<name>/` while the container is still running
- Disk `Caddyfile` has no hostname that still answers in the browser (`abpd.graspvisual.com`)
- `git status` is clean on `main` after a pull/checkout, but a site that was up is one Caddy restart away from 404
- App checkout is on a visual/Pages branch and `server/` or `Dockerfile` VPS commits are gone

**Root Causes:**
1. `git pull` / `git checkout` / `git reset --hard` in `/vps` restored `Caddyfile` from `main`, which does not include every live site block
2. `git clean -fd` deleted gitignored env files or untracked compose. ABPD **compose + Caddy are on `main` as of 2026-10-31**; `env.production` and `projects/abpd` (non-submodule clone) are still not fully in the infra repo. Older recovery used `origin/add-abpd-staging` — check `git ls-files environments/production/projects/abpd` before assuming the branch is required.
3. The agent pulled the infra repo when the user asked to update one app
4. The agent checked out the visual/Pages branch on a split-branch app (ABPD: `cursor/vite-tailwind-homepage-starter` vs `vps-abpd-staging`)

**Do not:** restart Caddy, `git reset --hard`, or `git clean` to "fix" it.

**Solution 1: Restore Caddy from the still-running container**
```bash
diff -u /vps/infrastructure/reverse-proxy/Caddyfile \
  <(docker exec vps-reverse-proxy cat /etc/caddy/Caddyfile)
docker exec vps-reverse-proxy cat /etc/caddy/Caddyfile \
  > /vps/infrastructure/reverse-proxy/Caddyfile
```

**Solution 2: Restore compose from git or the live container**
```bash
git show HEAD:environments/production/projects/abpd/docker-compose.yml
# Older checkouts: git show origin/add-abpd-staging:environments/production/projects/abpd/docker-compose.yml
docker inspect <container> --format '{{json .HostConfig}}'
```

**Solution 3: Split-branch app — rebase, do not checkout the site branch**
```bash
cd /vps/projects/<name>
git fetch origin
git checkout <vps-branch>
git rebase origin/<site-branch>
```

Full procedure: [`GIT_PULL_SAFETY.md`](/vps/docs/maintenance/GIT_PULL_SAFETY.md). Agent rule: `.cursor/rules/18-git-pull-safety.md`.

---

## Additional Resources

- [PROJECT_STANDARDS.md](../integration/PROJECT_STANDARDS.md) - Technical requirements
- [LICENSING_AND_STORE_INTEGRATION.md](../integration/LICENSING_AND_STORE_INTEGRATION.md) - Portal + SVC licensing model
- [QUICK_REFERENCE_ADDING_PROJECTS.md](../QUICK_REFERENCE_ADDING_PROJECTS.md) - Integration steps
- [REVERSE_PROXY.md](../setup/REVERSE_PROXY.md) - Caddy routing and Grafana edge auth
- [MONITORING.md](../setup/MONITORING.md) - Grafana/Loki/Promtail ops, LogQL, boundary tests
- [HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) - Postgres/Redis/Grafana patched bases
- [`GIT_PULL_SAFETY.md`](/vps/docs/maintenance/GIT_PULL_SAFETY.md) - GitHub pulls vs live Caddy/compose

---

**Last Updated:** 2026-10-31


