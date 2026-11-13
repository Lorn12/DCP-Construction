# Production Hardening Pass

**Last Updated:** 2026-06-07

## Purpose

The generator (`/vps/scripts/generate-new-project.sh`) creates a **working baseline** stack for fast onboarding. Deployed production projects on this VPS use a **hardened** stack. Run this pass before treating a new project as production-ready.

## Baseline vs Hardened

| Area | Generator baseline | Production hardened (this VPS) |
|------|-------------------|--------------------------------|
| Postgres image | `postgres:15-alpine` (generator baseline) | `vps-postgres15:patched` (or 16/17) built from **Debian** `postgres` digest + `apt dist-upgrade` via `/vps/infrastructure/images/postgres/` — see [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) |
| Redis image | `redis:7-alpine` (generator baseline) | `vps-redis8:patched` (`apk upgrade`) with TLS + password |
| Container security | Default | `security_opt: no-new-privileges:true`, `cap_drop: ALL`, minimal `cap_add` |
| Filesystem | Writable | `read_only: true` + `tmpfs` for temp paths |
| Postgres TLS | Off | SSL enabled with certs from `/vps/infrastructure/ssl/postgres/` |
| Secrets in compose | Some vars in `environment:` | Secrets only in `env_file` (see rule `17-docker-compose-secrets`) |

Reference hardened compose files:

- `/vps/environments/production/projects/growplan/docker-compose.yml`
- `/vps/environments/production/projects/etp/docker-compose.yml`

## When to Run

Run after initial deploy succeeds and before customer-facing launch:

1. Generator scaffold is working (health check passes).
2. Portal + SVC integration is configured (if licensed product).
3. You are ready to align with VPS security standards.

## Hardening Checklist

### 1) Secrets and compose safety

- [ ] Remove secrets from `environment:` blocks in `docker-compose.yml` (use `env_file` only for API **and** Postgres services).
- [ ] Do **not** set `LICENSE_SERVER_APP_API_KEY: ${LICENSE_SERVER_APP_API_KEY:-}` in compose `environment:` — it overrides `env_file` with an empty host value (see growplan fix in [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md) §3.2).
- [ ] Do **not** set `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` on the Postgres service — same empty-host override (fixed in growplan and etp production compose; see TROUBLESHOOTING §3.2).
- [ ] Quote `LICENSE_SERVER_APP_API_KEY` with single quotes in `env.production` when the value contains `$` characters.
- [ ] For hardened Redis, use `$$REDIS_PASSWORD` in `command` and healthcheck (runtime expansion inside container) — see [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md).
- [ ] Run `/vps/scripts/verify-compose-secrets.sh` — fix any reported issues.
- [ ] After deploy, run `/vps/scripts/verify-runtime-secrets.sh production` — fix any empty or placeholder runtime secrets.
- [ ] Confirm `env.production` is not committed and passwords are 32+ characters.
- [ ] After SVC app registration, save `LICENSE_SERVER_APP_API_KEY` to product `env.production` and verify license check returns non-401 from the product container.

### 2) Swap to patched infrastructure images

- [ ] Replace stock Postgres with build from `/vps/infrastructure/images/postgres` (set `BASE_IMAGE` digest for PG 15/16/17 from `.security/pinned-images.manifest.yaml`).
- [ ] Replace stock Redis with build from `/vps/infrastructure/images/redis8` if the project uses Redis.
- [ ] Mount TLS certs from `/vps/infrastructure/ssl/postgres/` and `/vps/infrastructure/ssl/redis/` as in growplan/etp.

### 3) Container hardening

- [ ] Add `security_opt: [no-new-privileges:true]` to all services.
- [ ] Add `cap_drop: [ALL]` and minimal `cap_add` only where required (Postgres/Redis patterns in growplan).
- [ ] Set `read_only: true` on API and database/cache containers.
- [ ] Add `tmpfs` mounts for `/tmp` and service-specific runtime dirs.

### 4) Network and routing

- [ ] API service on **both** project network and environment network (`production-network`, etc.).
- [ ] No unexpected public ports — run `/vps/scripts/check-public-surface.sh`.
- [ ] Caddy upstream container names match compose `container_name` values.

### 5) Verification

- [ ] `docker compose config` succeeds with real env files.
- [ ] Health endpoint returns 200 through Caddy.
- [ ] `/vps/scripts/health-check.sh production <project-name>`
- [ ] `/vps/scripts/verify-all-projects.sh --detailed --check-containers`

## Legacy / Non-Standard Layouts

Some existing projects predate the current generator defaults:

| Project | Note |
|---------|------|
| `etp` | Code at `/vps/projects/api`, not `/vps/etp` |
| `timekeeper` | Code at `projects/timekeeper` (`build.context: ../../../../projects/timekeeper`), custom domain |
| `growplan` | Code at `projects/growplan`, custom domain `growplan.app`, hardened compose |

New projects should start with generator defaults, then apply this hardening pass. Custom domains and in-project build contexts are valid when documented in Portal `appUrl` and Caddy.

Full layout reference: [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md). Custom domain TLS: [CUSTOM_DOMAIN_AND_TLS.md](CUSTOM_DOMAIN_AND_TLS.md).

## Related

- [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md)
- [ADDING_NEW_PROJECTS.md](ADDING_NEW_PROJECTS.md)
- [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md)
- `/vps/docs/security/SECURITY_HARDENING.md`
- `/vps/.cursor/rules/17-docker-compose-secrets.md`
