# Non-Standard Compose Layouts

**Audience:** Teams whose app does not match the generator default (single API + Postgres + Redis)  
**Last Updated:** 2026-10-31  
**Verified against:** production `docker-compose.yml` files under `environments/production/projects/`

The generator (`/vps/scripts/generate-new-project.sh`) scaffolds a **baseline** stack. These production projects use **different** layouts — copy patterns from them, not only the template.

---

## Generator default (new projects)

| Item | Default |
|------|---------|
| Code path | `/vps/projects/<project-name>` |
| `build.context` | `../../../../projects/<project-name>` |
| Git tracking | Submodule at `projects/<project-name>` (recommended) — see [../setup/VPS_STACK_STRUCTURE.md](../setup/VPS_STACK_STRUCTURE.md) |
| Services | `postgres`, `redis`, `api` |
| API container | `{project-name}-api-prod` |
| DB container | `{project-name}-db-prod` |
| Project network subnet | `172.30.<project-number>.0/24` (see [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md) § Project numbers) |

After first deploy, apply [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md).

---

## Production layouts today

### `tasquantum` — standalone app submodule (target pattern)

| Item | Value |
|------|--------|
| App code | `/vps/projects/tasquantum` (git submodule) |
| Deploy | `environments/production/projects/tasquantum/` only |
| `build.context` | `../../../../projects/tasquantum` |
| Routing | Custom domain `https://www.tasquantum.com` |

### `abpd` — TasQuantum-style Node container (Bellbottoms)

| Item | Value |
|------|--------|
| App code | `/vps/projects/abpd` (own git remote; not a submodule yet) |
| Deploy | `environments/production/projects/abpd/` only |
| `build.context` | `../../../../projects/abpd` |
| Routing | Custom hostname `https://abpd.graspvisual.com` |
| Container | `abpd-app-prod` (no API/DB) |
| Subnet | `172.30.4.0/24` on `abpd-prod-network` |
| Git | Visual: `cursor/vite-tailwind-homepage-starter`; VPS: `vps-abpd-staging` — rebase VPS onto visual, never check out the Pages branch on the server. See [GIT_PULL_SAFETY.md](/vps/docs/maintenance/GIT_PULL_SAFETY.md). |

### `etp` — API in `projects/api` (tracked in VPS repo)

| Item | Value |
|------|--------|
| Compose | `environments/production/projects/etp/docker-compose.yml` |
| API `build.context` | `../../../../projects/api` (code at `/vps/projects/api`) |
| Routing | Path: `https://app.graspvisual.com/etp/*` |
| Portal | Desktop launch: `downloadUrl` (not `appUrl`) |
| Subnet (pinned) | `172.30.1.0/24` on `etp-prod-network` |
| DB image | `infrastructure/images/postgres` (PG15 digest) → `vps-postgres15:patched` |
| Secrets | `POSTGRES_PASSWORD`, `LICENSE_SERVER_*` in `env.production` only — not in compose `environment:` (see TROUBLESHOOTING §3.2) |
| Print-history API | `X-API-Key` + `X-User-Email` + SVC license gate — see [projects/api/README.md](../../projects/api/README.md) and [ETP_DESKTOP_CLIENT_FOLLOWUP.md](ETP_DESKTOP_CLIENT_FOLLOWUP.md) |
| CI smoke | `scripts/ci/smoke-test-etp-api.sh` uses compose project `etp-smoke` so production containers are not torn down |

### `growplan` — app submodule + multi-service deploy compose

| Item | Value |
|------|--------|
| App code | `/vps/projects/growplan` (git submodule) |
| Compose | `environments/production/projects/growplan/docker-compose.yml` |
| Services | `postgres`, `redis`, `api`, `frontend` |
| API `build.context` | `../../../../projects/growplan` with `dockerfile: backend/Dockerfile` |
| Frontend | `../../../../projects/growplan/frontend` → container `growplan-frontend-prod` |
| DB/Redis images | `../../../../infrastructure/images/postgres` (PG17 digest), `redis8` |
| Volume mounts | `projects/growplan/ref`, `projects/growplan/tools` (read-only into API) |
| Routing | Custom domain `growplan.app` (site block in `Caddyfile`, not path snippet) |
| Networks | `growplan-prod-network` + external `production-network` (no fixed `ipam` subnet in this file) |
| Testing env template | `environments/testing/projects/growplan/env.testing.example` (not under production) |

### `timekeeper` — app submodule + deploy-only compose

| Item | Value |
|------|--------|
| App code | `/vps/projects/timekeeper` (git submodule) |
| Compose | `environments/production/projects/timekeeper/docker-compose.yml` (compose project: directory name `timekeeper`; named volume `gv-timekeeper_gv_timekeeper_pgdata`) |
| Services | `db`, `app` (no separate API/frontend services) |
| `build.context` | `../../../../projects/timekeeper` |
| Build args | `VITE_API_BASE_URL`, `VITE_GOOGLE_MAPS_API_KEY`, `VITE_IDLE_SESSION_TIMEOUT_MINUTES` passed at **image build** time |
| DB container | `gv-timekeeper-db` (non-standard name — see [BACKUPS_FOR_NEW_PROJECTS.md](BACKUPS_FOR_NEW_PROJECTS.md)) |
| DB image | `infrastructure/images/postgres` (PG16 digest) → `vps-postgres16:patched`; TLS certs mounted (`ssl=on`) |
| Routing | Custom domain `time.graspvisual.com`; legacy path redirect from `app.graspvisual.com/timekeeper` |

### `svc` — app submodule + deploy-only compose

| Item | Value |
|------|--------|
| App code | `/vps/projects/svc` (git submodule) |
| Compose | `environments/production/projects/svc/docker-compose.svc.yml` |
| Services | `svc-db`, `api` |
| API `build.context` | `../../../../projects/svc` |
| Env files | `env.production` in deploy dir (compose `env_file`; validate with `docker compose --env-file env.production config`) |
| DB image | `infrastructure/images/postgres` (PG15 digest) → `vps-postgres15:patched` |
| Routing | Path: `https://app.graspvisual.com/svc/*` |

### `portal` — app submodule + deploy-only compose

| Item | Value |
|------|--------|
| App code | `/vps/projects/portal` (git submodule) |
| Compose | `environments/production/projects/portal/docker-compose.portal.yml` |
| Services | `app` (Next.js storefront) |
| `build.context` | `../../../../projects/portal` |
| Env file | `.env` in deploy dir (not `env.production`; includes `RESEND_API_KEY` for enterprise contact) |
| Routing | `https://store.graspvisual.com` |
| App registry | `projects/portal/src/config/apps/index.ts` |

---

## When to deviate from the generator

| Need | Action |
|------|--------|
| Monorepo frontend + API | Add services to compose (see `growplan`) or single container with static assets (see `timekeeper`) |
| Legacy code path | Update `build.context` (historical: `etp` at `/vps/api`; now `projects/api`) |
| Custom domain | Separate Caddy site block — [CUSTOM_DOMAIN_AND_TLS.md](CUSTOM_DOMAIN_AND_TLS.md) |
| Vite/React env at build time | Pass `args:` under `build:` from `env.production` (see `timekeeper` compose comments) |
| Extra infrastructure (queue, etc.) | [AVAILABLE_SERVICES.md](AVAILABLE_SERVICES.md); if not listed, treat as VPS-repo change |

Document the chosen layout in [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md) (build context, routing, services).

---

## Related

- [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md) — legacy table + hardening steps  
- [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) — patched Postgres/Redis/Grafana bases  
- [CUSTOM_DOMAIN_AND_TLS.md](CUSTOM_DOMAIN_AND_TLS.md)  
- [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md)  
- [../setup/VPS_STACK_STRUCTURE.md](../setup/VPS_STACK_STRUCTURE.md)
