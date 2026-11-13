# Quick Reference: Add Project to VPS

**Last Updated:** 2026-10-31

**Context:** [integration/VPS_SYSTEM_OVERVIEW.md](integration/VPS_SYSTEM_OVERVIEW.md) · [integration/VPS_PROJECTS_REGISTRY.md](integration/VPS_PROJECTS_REGISTRY.md)

## 0) Pick project number

- Integer **1–255**, unused on this host — see [integration/VPS_PROJECTS_REGISTRY.md](integration/VPS_PROJECTS_REGISTRY.md) § Project numbers
- Check: `rg 'subnet: 172\.30\.' /vps/environments --glob '*.yml'`

## 1) Generate

```bash
/vps/scripts/generate-new-project.sh <project-name> <project-number> --env production
```

Not a single-API layout? Read [integration/NON_STANDARD_COMPOSE_LAYOUTS.md](integration/NON_STANDARD_COMPOSE_LAYOUTS.md) before deploy.

## 2) Fill and validate env

```bash
cd /vps/environments/production/projects/<project-name>
cp env.production.example env.production
nano env.production
cp env.production .env
docker compose --env-file env.production config
/vps/scripts/verify-env-files.sh <project-name>
```

Licensed products — minimum:

- `LICENSE_SERVER_URL`
- `LICENSE_SERVER_APP_ID` (same as Portal app ID)
- `LICENSE_SERVER_APP_API_KEY` (from SVC registration; regenerate in SVC admin if lost)
- Store license vars in `env.production` only — do not override via compose `environment:` (TROUBLESHOOTING §3.2)
- Verify license check from API container returns non-401 (TROUBLESHOOTING §13)

Details: [setup/ENV_FILES_SETUP.md](setup/ENV_FILES_SETUP.md) · [integration/LICENSING_AND_STORE_INTEGRATION.md](integration/LICENSING_AND_STORE_INTEGRATION.md)

## 3) Place app code

- Default `build.context`: `../../../../projects/<project-name>` → code at `/vps/projects/<project-name>`
- Register as git submodule under `projects/<project-name>` when possible — see [setup/VPS_STACK_STRUCTURE.md](setup/VPS_STACK_STRUCTURE.md)

## 4) Routing (Caddy)

**Path-based** (`app.graspvisual.com/<project>/`):

- Merge `caddy.production.snippet.txt` into `infrastructure/reverse-proxy/Caddyfile` under `app.graspvisual.com:443`

**Custom domain:**

- [integration/CUSTOM_DOMAIN_AND_TLS.md](integration/CUSTOM_DOMAIN_AND_TLS.md) (DNS, certs, site block — not path snippet)

Validate + apply ([setup/REVERSE_PROXY.md](setup/REVERSE_PROXY.md)):

```bash
/vps/scripts/ensure-reverse-proxy-env.sh
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose restart caddy
/vps/scripts/verify-caddy-routes.sh
```

## 5) Deploy

```bash
/vps/scripts/deploy.sh production <project-name>
```

Redeploy Portal if Portal config changed: `/vps/scripts/deploy.sh production portal`

## 6) Verify

```bash
/vps/scripts/health-check.sh production <project-name>
/vps/scripts/verify-all-projects.sh --detailed --check-containers
/vps/scripts/verify-compose-secrets.sh
/vps/scripts/verify-runtime-secrets.sh production
/vps/scripts/verify-new-project-onboarding.sh
/vps/scripts/check-public-surface.sh
```

## 7) Harden (before customer launch)

[integration/PRODUCTION_HARDENING_PASS.md](integration/PRODUCTION_HARDENING_PASS.md)

Patched Postgres/Redis/Grafana bases: [setup/HARDENED_IMAGES.md](setup/HARDENED_IMAGES.md)

```bash
bash /vps/scripts/ci/validate-hardened-images.sh
bash /vps/scripts/ci/test-hardened-images-smoke.sh
```

## 8) Portal + SVC (licensed products only)

Follow [integration/LICENSING_AND_STORE_INTEGRATION.md](integration/LICENSING_AND_STORE_INTEGRATION.md) sections A–E, including:

- SVC register + `verify-app-database.js` when applicable
- Portal app config + `visibility: "public"` when ready
- Stripe product/price mapping in SVC for paid plans
- Store URLs + license E2E
- [integration/PORTAL_COMPLIANCE_UPDATES.md](integration/PORTAL_COMPLIANCE_UPDATES.md) if needed

**Internal-only** (no store): skip this step; see [integration/NEW_PROJECT_ONBOARDING_RUNBOOK.md](integration/NEW_PROJECT_ONBOARDING_RUNBOOK.md).

## 9) Backups and registry

```bash
/vps/scripts/backup.sh production <project-name>
```

If successful, add `<project-name>` to `BACKUP_PROJECTS` in `/vps/scripts/lib/backup-manifest.sh` (or `BACKUP_OMIT_PROJECTS` if stateless) — [integration/BACKUPS_FOR_NEW_PROJECTS.md](integration/BACKUPS_FOR_NEW_PROJECTS.md)

Update [integration/VPS_PROJECTS_REGISTRY.md](integration/VPS_PROJECTS_REGISTRY.md), then:

```bash
/vps/scripts/verify-projects-registry.sh
/vps/scripts/sync-template-package.sh
```
