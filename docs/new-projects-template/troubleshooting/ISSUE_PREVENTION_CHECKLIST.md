# Issue Prevention Checklist

**Last Updated:** 2026-06-07
**Purpose:** Proactive checklist to prevent common VPS deployment issues

---

## Pre-Deployment Checks

Before deploying any project:

- [ ] **Project name follows conventions**
  - Lowercase, hyphens only
  - No spaces or underscores
  - Example: `billing-system` ✓, `BillingSystem` ✗

- [ ] **Docker Compose files verified**
  - No `version: '3.8'` declaration
  - All container names follow: `{project}-{service}-{env}`
  - All API/services on BOTH networks (project + environment)
  - Resource limits defined for all services
  - Health checks configured

- [ ] **Environment variables prepared**
  - Env files created from examples
  - Production: No suffix (`POSTGRES_PASSWORD`)
  - Testing: `_TEST` suffix (`POSTGRES_PASSWORD_TEST`)
  - Development: `_DEV` suffix (`POSTGRES_PASSWORD_DEV`)
  - All secrets are 32+ characters
  - No placeholder values remain

- [ ] **Networks created**
  - Production network exists
  - Testing network exists
  - Development network exists
  - Run: `/vps/scripts/create-networks.sh`

- [ ] **Application code ready**
  - Code placed at `/vps/projects/<project-name>` or `build.context` updated to the real repo path
  - Dockerfile follows standards
  - Health endpoint implemented (`/health` or `/api/health`)
  - For Node.js: `package-lock.json` committed (if using `npm ci`)

- [ ] **Reverse-proxy configuration ready**
  - Caddy snippet prepared for all required environments
  - Upstream names and path prefixes match the project
  - Changes merged into `infrastructure/reverse-proxy/Caddyfile`
  - If using `/grafana/*` or first-time proxy setup: `/vps/scripts/ensure-reverse-proxy-env.sh` run on VPS
  - If starting or rotating Grafana admin login: `/vps/scripts/ensure-monitoring-env.sh` run on VPS (see `setup/MONITORING.md`)

- [ ] **Hardened base images (production Postgres/Redis)**
  - Compose builds from `infrastructure/images/postgres` or `redis8` with manifest digests — see `setup/HARDENED_IMAGES.md`
  - After image rebuild: `bash /vps/scripts/ci/test-hardened-images-smoke.sh`
  - Redis stacks: always deploy with `docker compose --env-file env.production up -d` when secrets are required

---

## During Deployment Checks

While deploying:

- [ ] **Deploy script runs successfully**
  - No build errors
  - No container start failures
  - Health checks pass

- [ ] **Reverse proxy restarts automatically**
  - Deploy script restarts the reverse proxy
  - Upstream changes picked up
  - Wait 5-10 seconds after restart

- [ ] **DNS resolution verified**
  - Deploy script tests DNS from the reverse-proxy container
  - All containers reachable
  - No DNS errors in logs

- [ ] **Containers are healthy**
  - All containers show `healthy` status
  - No `unhealthy` or `restarting` containers
  - Health endpoints respond

---

## Post-Deployment Verification

After deployment:

- [ ] **Container status**
  ```bash
  docker ps | grep project-name
  # All containers should be "Up" and "healthy"
  ```

- [ ] **Network membership**
  ```bash
  docker inspect project-api-prod | grep -A 10 Networks
  # Should show both project and environment networks
  ```

- [ ] **DNS resolution**
  ```bash
  docker exec vps-reverse-proxy ping -c 1 project-api-prod
  # Should succeed
  ```

- [ ] **Health endpoints**
  ```bash
  curl -H "Host: app.graspvisual.com" http://localhost/project-name/api/health
  # Should return 200 OK
  ```

- [ ] **Reverse-proxy configuration**
  ```bash
  /vps/scripts/ci/validate-caddyfile.sh
  cd /vps/infrastructure/reverse-proxy
  docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
  /vps/scripts/verify-caddy-routes.sh
  # Should exit successfully
  ```

- [ ] **SSL certificates** (if using HTTPS)
  ```bash
  ls -la /vps/infrastructure/reverse-proxy/ssl/app.graspvisual.com/
  # Should have fullchain.pem and privkey.pem
  ```

---

## Common Mistakes to Avoid

### ❌ Don't Do This

1. **Creating containers on only one network**
   ```yaml
   # ❌ WRONG - Only project network
   networks:
     - project-prod-network
   ```

2. **Using wrong variable names**
   ```bash
   # ❌ WRONG - Using _PROD suffix in production
   POSTGRES_PASSWORD_PROD=...
   ```

3. **Forgetting to restart the reverse proxy after deployment**
   ```bash
   # ❌ WRONG - Deploy but don't restart the reverse proxy
   docker compose up -d
   # Proxy may still serve stale upstream state
   ```

4. **Hardcoding stale upstreams in Caddy**
   ```caddy
   # ❌ WRONG - upstream doesn't match deployed service name
   reverse_proxy old-project-api-prod:4001
   ```

5. **Creating users with existing GIDs**
   ```dockerfile
   # ❌ WRONG - GID 1000 already exists in node:18-alpine
   RUN addgroup -g 1000 appuser
   ```

### ✅ Do This Instead

1. **Dual network configuration**
   ```yaml
   # ✅ CORRECT - Both networks
   networks:
     - project-prod-network
     - production-network  # For reverse-proxy access
   ```

2. **Correct variable naming**
   ```bash
   # ✅ CORRECT - No suffix for production
   POSTGRES_PASSWORD=...
   ```

3. **Automatic reverse-proxy restart**
   ```bash
   # ✅ CORRECT - Deploy script handles this
   /vps/scripts/deploy.sh production project-name
   # Script automatically restarts the reverse proxy
   ```

4. **Dynamic DNS resolution**
  ```caddy
  # ✅ CORRECT - upstream matches deployed service
  reverse_proxy project-api-prod:4001
   ```

5. **Use base image's user**
   ```dockerfile
   # ✅ CORRECT - Use existing user
   USER node  # Base image already has this
   ```

---

## Quick Reference by Issue Type

### DNS Resolution Issues
- [ ] Containers on both networks
- [ ] Reverse proxy restarted after deployment
- [ ] DNS resolution tested and working

### Environment Variable Issues
- [ ] Correct naming (suffix for test/dev)
- [ ] Env files exist and filled
- [ ] `env_file` directive in docker-compose.yml

### Container Deployment Issues
- [ ] Build succeeds
- [ ] Env variables loaded
- [ ] Resources available
- [ ] Health checks configured

### SSL Certificate Issues
- [ ] Certificates obtained
- [ ] Certificates copied to reverse-proxy directory
- [ ] Paths correct in `Caddyfile`

### Network Issues
- [ ] Subnet ranges don't conflict
- [ ] Networks created
- [ ] Containers on correct networks

---

## Automated Checks

Run these scripts to verify everything:

```bash
# Comprehensive diagnostic
/vps/scripts/diagnose-issues.sh

# Codebase verification
/vps/scripts/verify-codebase.sh

# Health check
/vps/scripts/health-check.sh production <project-name>

# Everything
/vps/scripts/verify-everything.sh
```

---

**Last Updated:** 2026-05-26
**See Also:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Detailed issue solutions
- [STANDARD_PRACTICES.md](STANDARD_PRACTICES.md) - Fix root causes
- `../integration/ADDING_NEW_PROJECTS.md` - Package setup guide


