# Adding New Projects to VPS

**Audience:** VPS administrator + project owner  
**Last Updated:** 2026-06-07

**Read first:** [VPS_SYSTEM_OVERVIEW.md](VPS_SYSTEM_OVERVIEW.md) · [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md)

## Purpose

Provide one canonical, Caddy-aligned process for onboarding a new project into VPS, including Portal + SVC integration for licensed products.

## Inputs Required from Project Team

- Project name (lowercase-hyphen format, e.g. `billing-system`)
- Service map (API/frontend/db/redis, internal ports)
- Target environments (`production`, optional `testing`/`development`)
- Repository URL and default branch
- `.env.example` variables and health endpoint path
- Licensing and storefront intent:
  - App ID for Portal + SVC (example: `billing-system`)
  - Main product URL model (path-based or custom domain)
  - Trial/pricing plan requirements
  - Desktop download vs web app launch (`downloadUrl` vs `appUrl`)
  - Whether Stripe paid plans are needed (configured in SVC)

## End-to-End VPS Flow

1. Pick an unused **project number** (1–255) — [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md) § Project numbers
2. Generate structure and templates:
   - `/vps/scripts/generate-new-project.sh <project-name> <project-number> --env production`
3. Create real env files from generated examples:
   - `cp env.production.example env.production`
4. Validate env before deploy:
   - `docker compose --env-file env.production config`
   - `/vps/scripts/verify-env-files.sh <project-name>`
   - [../setup/ENV_FILES_SETUP.md](../setup/ENV_FILES_SETUP.md)
5. If `.env` exists in that directory, keep it synced with `env.production`:
   - `cp env.production .env`
6. Clone or place the application code at `/vps/projects/<project-name>`:
   - Generated compose files default to `build.context: ../../../../projects/<project-name>`
   - If the code lives elsewhere, update `build.context` before deploying (see [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md))
7. Routing:
   - Path-based: merge generated Caddy snippet into `Caddyfile`
   - Custom domain: [CUSTOM_DOMAIN_AND_TLS.md](CUSTOM_DOMAIN_AND_TLS.md) (site block + TLS, not path snippet only)
8. Validate/apply Caddy config ([../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md)):
   - `/vps/scripts/ci/validate-caddyfile.sh`
   - `cd /vps/infrastructure/reverse-proxy && docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile`
   - `docker compose restart caddy`
   - `/vps/scripts/verify-caddy-routes.sh`
9. Deploy:
   - `/vps/scripts/deploy.sh production <project-name>`
10. Verify baseline:
   - `/vps/scripts/health-check.sh production <project-name>`
   - `/vps/scripts/verify-all-projects.sh --detailed --check-containers`
   - `/vps/scripts/verify-compose-secrets.sh`
   - `/vps/scripts/verify-runtime-secrets.sh production`
   - `/vps/scripts/check-public-surface.sh`
11. Apply production hardening (before customer launch):
   - [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md)
   - Patched Postgres/Redis wiring: [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md)
   - After hardening: `bash /vps/scripts/ci/test-hardened-images-smoke.sh`
12. Backups:
   - [BACKUPS_FOR_NEW_PROJECTS.md](BACKUPS_FOR_NEW_PROJECTS.md) — test `backup.sh`; update `scripts/lib/backup-manifest.sh`; run `verify-backup-coverage.sh`
13. Portal + SVC (licensed products — can run in parallel with deploy/routing):
   - See [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md) (sections A–E)
   - Compliance: [PORTAL_COMPLIANCE_UPDATES.md](PORTAL_COMPLIANCE_UPDATES.md)

## Routing Standard (Caddy)

- Production domain: `app.graspvisual.com`
- Testing domain: `app-test.graspvisual.com`
- Development domain: `app-dev.graspvisual.com` (HTTPS; HTTP redirects to HTTPS)
- Path-based routing pattern:
  - `/<project>/api/*` to API container
  - `/<project>/*` catch-all to project app/API target

Generator scripts now create per-environment Caddy snippet files in each project directory. They are reviewed then copied into `Caddyfile`.

## Portal + SVC Integration (Required for Licensed Products)

Every commercial product on this VPS uses the shared Portal + SVC platform:

- **Portal** hosts the store grid, per-app landing page, and pricing page at `store.graspvisual.com/{appId}`
- **SVC** owns trials, subscriptions, checkout, and license validation
- **Your project** hosts the live app at its main URL and validates entitlements against SVC

See [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md) for the full end-to-end guide.

Minimum platform steps for a new licensed product:

1. Register the app in SVC and issue the app-specific API key.
2. Add Portal app config in `portal/src/config/apps/{appId}.ts` and redeploy Portal.
3. Set product env vars from generated examples:
   - `LICENSE_SERVER_URL`
   - `LICENSE_SERVER_APP_ID`
   - `LICENSE_SERVER_APP_API_KEY`
4. Choose the main product URL:
   - default path: `https://app.graspvisual.com/<project>/`
   - or branded domain: example `growplan.app`, `time.graspvisual.com`
5. Update Portal compliance pages if the product adds payments, cookies, or new data collection.

Contract summary:

- Portal ↔ SVC uses `PORTAL_API_KEY` (server-to-server only).
- New project backends use per-app key + `X-App-ID` for SVC.
- Stripe webhook secret stays in SVC (`STRIPE_WEBHOOK_SECRET`).
- New projects should not reuse `PORTAL_API_KEY` unless the project itself is a portal backend.

## Verification Gate

Before handoff complete, require:

- Health endpoint returns 200 via routed URL.
- Containers are healthy in selected environments.
- Compose secrets scan passes: `/vps/scripts/verify-compose-secrets.sh`
- Runtime secret check passes after deploy: `/vps/scripts/verify-runtime-secrets.sh production`
- No unexpected public ports: `/vps/scripts/check-public-surface.sh`
- `.env`/`env.*` consistency verified with `docker compose config`
- Production hardening pass completed for customer-facing launch: [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md)
- Hardened DB/cache images verified (if applicable): `bash /vps/scripts/ci/test-hardened-images-smoke.sh` — see [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md)
- Portal + SVC loop verified for licensed products (landing, pricing, license check)
- Portal compliance pages updated if needed

## After adding a project

Update [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md) and run `/vps/scripts/verify-projects-registry.sh`, then `/vps/scripts/sync-template-package.sh`.

## Related

- [VPS_SYSTEM_OVERVIEW.md](VPS_SYSTEM_OVERVIEW.md)
- [QUICK_REFERENCE_ADDING_PROJECTS.md](../QUICK_REFERENCE_ADDING_PROJECTS.md)
- [PROJECT_ADDITION_WORKFLOW.md](PROJECT_ADDITION_WORKFLOW.md)
- [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md)
- [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md)
- [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md)
- [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md)
