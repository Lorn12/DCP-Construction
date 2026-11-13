# New Project Onboarding Runbook

**One-page checklist** — details live in linked docs.  
**Last Updated:** 2026-06-07

## Before VPS (in your app repo)

- [ ] Read [VPS_SYSTEM_OVERVIEW.md](VPS_SYSTEM_OVERVIEW.md)
- [ ] Copy package: `cp -r /path/to/vps/docs/new-projects-template ./docs/vps-integration`
- [ ] Dockerfile: non-root (`USER node` on `node:*-alpine`), pinned base, health on `127.0.0.1`
- [ ] `GET /health` → 200 JSON
- [ ] `.env.example` complete (licensed: `LICENSE_SERVER_*`)

## VPS admin — all products

- [ ] [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md) — plan new row; **pick unused project number** (§ Project numbers)
- [ ] `generate-new-project.sh <name> <number> --env production`
- [ ] Layout not single-API default? → [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md)
- [ ] Code at `/vps/projects/<name>` (or update `build.context` per registry)
- [ ] `cp env.production.example env.production` · fill secrets · `cp env.production .env`
- [ ] Validate env before deploy:
  - `docker compose --env-file env.production config`
  - `/vps/scripts/verify-env-files.sh <name>` (if production dir exists)
  - See [../setup/ENV_FILES_SETUP.md](../setup/ENV_FILES_SETUP.md)
- [ ] Routing:
  - Path on `app.graspvisual.com` → merge generated Caddy snippet
  - Custom domain → [CUSTOM_DOMAIN_AND_TLS.md](CUSTOM_DOMAIN_AND_TLS.md)
- [ ] Validate + restart reverse proxy ([../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md)):
  - `/vps/scripts/ci/validate-caddyfile.sh`
  - `docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile`
  - `docker compose restart caddy`
  - `/vps/scripts/verify-caddy-routes.sh`
- [ ] `deploy.sh production <name>`
- [ ] `health-check.sh` · `verify-compose-secrets.sh` · `verify-runtime-secrets.sh production` · `check-public-surface.sh`
- [ ] [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md) before customer launch
- [ ] Patched Postgres/Redis (if used): [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) — `validate-hardened-images.sh` + `test-hardened-images-smoke.sh`
- [ ] [BACKUPS_FOR_NEW_PROJECTS.md](BACKUPS_FOR_NEW_PROJECTS.md) — test `backup.sh`, update `scripts/lib/backup-manifest.sh` if applicable
- [ ] Update registry + `verify-projects-registry.sh` + `sync-template-package.sh`

## Licensed / storefront products (add to above)

Full detail: [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md). Minimum runbook:

### A. SVC

- [ ] Register app (`/svc/admin` or admin API); save `LICENSE_SERVER_APP_API_KEY` (or regenerate later via App Details → API in SVC admin)
- [ ] `LICENSE_SERVER_APP_ID` matches SVC `app_id` and Portal `appId`
- [ ] Store app key in `env.production` only — not in compose `environment:` with `${LICENSE_SERVER_APP_API_KEY:-}` (see TROUBLESHOOTING §3.2)
- [ ] `/vps/projects/svc/scripts/verify-app-database.js` (if applicable)
- [ ] Trial days + plan metadata in SVC admin
- [ ] Stripe product/price mapping in SVC (if paid plans)

### B. Portal

- [ ] `portal/src/config/apps/<appId>.ts` + register in `index.ts`
- [ ] `visibility: "public"` when ready for storefront (hidden apps stay off public `/api/*` routes)
- [ ] Landing, pricing, `appUrl` or `downloadUrl` (desktop: POST to `/api/download/{appId}`; GET returns 405)
- [ ] `deploy.sh production portal`

### C. Product env + backend

- [ ] `LICENSE_SERVER_URL`, `LICENSE_SERVER_APP_ID`, `LICENSE_SERVER_APP_API_KEY` in `env.production`
- [ ] Verify from product API container: license call to SVC returns non-401 (TROUBLESHOOTING §13)
- [ ] Desktop app? Client sends `code_verifier` on `/api/auth/oauth-tokens` — `projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md`
- [ ] Backend validates with `X-App-ID` + app key

### D. Main URL

- [ ] Path or custom domain live; Portal `appUrl` matches final URL

### E. Verify loop

- [ ] `store.graspvisual.com/<appId>` and `/pricing`
- [ ] Product health via public URL
- [ ] Trial/license check via SVC from product backend
- [ ] [PORTAL_COMPLIANCE_UPDATES.md](PORTAL_COMPLIANCE_UPDATES.md) if payments/cookies/new data

## Internal-only products (no store / no SVC)

Skip sections **Licensed** above. Still complete **VPS admin — all products** (deploy, verify, hardening, backups, registry).

---

## Links

| Doc | Use |
|-----|-----|
| [../QUICK_REFERENCE_ADDING_PROJECTS.md](../QUICK_REFERENCE_ADDING_PROJECTS.md) | Commands |
| [CUSTOM_DOMAIN_AND_TLS.md](CUSTOM_DOMAIN_AND_TLS.md) | Dedicated hostname + certs |
| [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md) | etp / growplan / timekeeper / tasquantum patterns |
| [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md) | Portal + SVC |
| [SECURITY_FOR_NEW_APPS.md](SECURITY_FOR_NEW_APPS.md) | Isolation + app security |
| [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) | Patched Postgres/Redis/Grafana bases |
