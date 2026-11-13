# VPS Projects Registry

**Purpose:** Single source of truth for what runs on this VPS today. Update this file whenever production projects, Portal apps, or routing change.  
**Last verified:** 2026-10-31 (ABPD/Bellbottoms staging on `abpd.graspvisual.com`; git-pull safety for live Caddy/compose)  
**Verify with:** `/vps/scripts/verify-projects-registry.sh`

## How to keep this updated

1. After adding/removing a project under `environments/production/projects/`, update the **Production projects** table below.
2. After adding/removing a Portal app in `projects/portal/src/config/apps/index.ts`, update the **Portal storefront apps** table.
3. After Caddy routing changes in `infrastructure/reverse-proxy/Caddyfile`, update **Production routing** columns.
4. Run `/vps/scripts/verify-projects-registry.sh` — it reports drift against live directories and Portal registry.
5. Run `/vps/scripts/sync-template-package.sh` so `docs/new-projects-template/` stays in sync.
6. Set **Last verified** to today's date when tables match the script output.

`VPS_SYSTEM_OVERVIEW.md` summarizes this registry for onboarding; do not duplicate long tables there—link here instead.

---

## Production projects (`environments/production/projects/`)

These directories have production `docker-compose` (or `docker-compose.*.yml`) on this VPS:

| VPS project dir | Type | Compose file | Primary routing (production) | App code / `build.context` | Notes |
|-----------------|------|--------------|------------------------------|----------------------------|-------|
| `svc` | Platform | `docker-compose.svc.yml` | `https://app.graspvisual.com/svc/*` | API: `../../../../projects/svc` | Deploy-only under `environments/`; app submodule at `projects/svc` |
| `portal` | Platform | `docker-compose.portal.yml` | `https://store.graspvisual.com` | `../../../../projects/portal` | Deploy-only under `environments/`; app submodule at `projects/portal` |
| `etp` | Product | `docker-compose.yml` | `https://app.graspvisual.com/etp/*` | API: `../../../../projects/api` (`/vps/projects/api`) | Email to Print; ETP API tracked in VPS repo |
| `growplan` | Product | `docker-compose.yml` | `https://growplan.app` (and `www` → apex) | API: `../../../../projects/growplan`; frontend: `../../../../projects/growplan/frontend` | Deploy-only under `environments/`; app submodule at `projects/growplan` |
| `timekeeper` | Product | `docker-compose.yml` | `https://time.graspvisual.com` | App: `../../../../projects/timekeeper`; DB: `infrastructure/images/postgres` (PG16 digest) | Deploy-only under `environments/`; app submodule at `projects/timekeeper` |
| `tasquantum` | Product | `docker-compose.yml` | `https://www.tasquantum.com` | App: `../../../../projects/tasquantum` (`/vps/projects/tasquantum`) | Marketing site; git submodule |
| `abpd` | Product | `docker-compose.yml` | `https://abpd.graspvisual.com` | App: `../../../../projects/abpd` (`/vps/projects/abpd`) | Bellbottoms marketing site; **project # 4** (`172.30.4.0/24`); clone not a submodule yet; visual branch `cursor/vite-tailwind-homepage-starter`, VPS branch `vps-abpd-staging` |
| `trading-bot-relay` | Product | `docker-compose.yml` | `https://app.graspvisual.com/trading-bot-relay/*` | App: `../../../../projects/trading-bot-relay` (`uhaop/trading-bot-relay`) | VPS capture relay for gv-01 parquet; submodule `vendor/trading-bot`; **project # 3** (`172.30.3.0/24`) |
| `party-captions` | Edge static + socat rollback | `docker-compose.yml` (socat, rollback only) | `https://app.graspvisual.com/party-captions/join/`, `/updates/` | Static under `certbot-webroot/party-captions/`; socat compose retained for emergency rollback | Live traffic uses `party-captions-bot` |
| `party-captions-bot` | Edge bot | `docker-compose.yml` | `/party-captions/join/exchange*`, `wss://…/party-captions/ws` | `ghcr.io/uhaop/party-captions-bot` on `production-network`; STT remote (gv-01) | Secrets in `.env` (gitignored); see project README |

**Not listed above:** projects that exist only as Portal config without a `environments/production/projects/<name>/` deploy (see Portal-only below).

---

## Portal storefront apps (`portal/src/config/apps/index.ts`)

Registered in code as of last verification:

| Portal `appId` | `visibility` | Launch target (from config) | VPS production app deploy |
|----------------|--------------|----------------------------|---------------------------|
| `etp` | `public` | `downloadUrl: /api/download/etp` (desktop; POST via UI) | Yes — `etp` |
| `growplan` | `public` | `appUrl: https://growplan.app` | Yes — `growplan` |
| `timekeeper` | `public` | `appUrl: https://time.graspvisual.com` | Yes — `timekeeper` |
| `gantry` | `hidden` | (no live product URL in config) | **No** — Portal config only; not under `production/projects/` |

Store surfaces for public apps:

- Landing: `https://store.graspvisual.com/{appId}`
- Pricing: `https://store.graspvisual.com/{appId}/pricing`
- Download (desktop): `POST https://store.graspvisual.com/api/download/{appId}` — email-gated trial via `DownloadGate`; **GET returns 405**
- Account: `https://store.graspvisual.com/account` (customer portal by email) and `/account/{appId}` (subscription lookup)

---

## Shared infrastructure (not product projects)

| Component | Location | Role |
|-----------|----------|------|
| Caddy reverse proxy | `infrastructure/reverse-proxy/` | TLS, routing, Grafana edge auth — [../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md) |
| Grafana | `infrastructure/monitoring/` (routed at `app.graspvisual.com/grafana/*`) | Monitoring UI — [../setup/MONITORING.md](../setup/MONITORING.md) |
| Patched DB/cache images | `infrastructure/images/` | Postgres/Redis/Grafana bases — see [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) |

---

## Environment hosts (path-based products)

| Environment | Shared app host | Notes |
|-------------|-----------------|-------|
| Production | `app.graspvisual.com` | HTTPS |
| Testing | `app-test.graspvisual.com` | HTTPS |
| Development | `app-dev.graspvisual.com` | HTTPS (cert live; HTTP redirects to HTTPS) |

New generated projects default to path-based routes on these hosts: `/<project>/api/*`, `/<project>/*`.

---

## Project numbers and Docker subnets

`generate-new-project.sh` requires `<project-number>` (integer **1–255**). The generator template sets the project network to:

```text
172.30.<project-number>.0/24
```

(source: `templates/new-project-template/docker-compose.production.yml.example`)

### Pick an unused number

1. List pinned subnets in the repo:

   ```bash
   rg 'subnet: 172\.30\.' /vps/environments --glob '*.yml'
   ```

2. Choose an integer not already used (generator allows 1–255).

3. Pass it to the generator:

   ```bash
   /vps/scripts/generate-new-project.sh <project-name> <number> --env production
   ```

### Known values on this VPS (last verified 2026-10-31)

| Project | Project # (if used) | Pinned `172.30.*` subnet in compose |
|---------|---------------------|-------------------------------------|
| `etp` | **1** | `172.30.1.0/24` in `etp/docker-compose.yml` |
| `tasquantum` | **2** | `172.30.2.0/24` in `tasquantum/docker-compose.yml` |
| `trading-bot-relay` | **3** | `172.30.3.0/24` in `trading-bot-relay/docker-compose.yml` |
| `abpd` | **4** | `172.30.4.0/24` in `abpd/docker-compose.yml` |
| `growplan`, `timekeeper`, `svc`, `portal` | — | No `172.30.*` subnet in production compose (named networks / Docker auto-assign) |
| `party-captions`, `party-captions-bot` | — | Bot joins `production-network`; no `172.30.*` project net |

`docs/setup/MULTI_ENV_ARCHITECTURE.md` describes **environment** networks (`172.20.0.0/16` production, etc.) — separate from per-project `172.30.<N>.0/24` in the generator template.

---

## New project defaults (generator)

| Item | Default |
|------|---------|
| Code path | `/vps/projects/<project-name>` |
| `build.context` | `../../../../projects/<project-name>` |
| Git (standalone apps) | Submodule at `projects/<project-name>` — see [../setup/VPS_STACK_STRUCTURE.md](../setup/VPS_STACK_STRUCTURE.md) |
| Licensing env vars | `LICENSE_SERVER_*` in `env.*.example` |
| Compose baseline | Per-project network + `production-network` on API |
| Project network | `172.30.<project-number>.0/24` |

See [ADDING_NEW_PROJECTS.md](ADDING_NEW_PROJECTS.md) and [../QUICK_REFERENCE_ADDING_PROJECTS.md](../QUICK_REFERENCE_ADDING_PROJECTS.md). Non-default layouts: [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md).

---

## Security stack walk (layers 1–10, 2026-06-07)

Top-down VPS security review order (infrastructure → platform → products → deploy wiring).

| Layer | Component | Path | Primary hardening (verified) | Reference |
|-------|-----------|------|------------------------------|-----------|
| **1** | Reverse proxy (Caddy) | `infrastructure/reverse-proxy/` | Grafana `basic_auth` on `/grafana/*`; non-root Caddy (UID 1000); pinned `caddy:2.11.4-alpine`; route verification scripts; certbot renewal without force-renewal fallback | [../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md) |
| **2** | Monitoring | `infrastructure/monitoring/` | Grafana edge auth + `monitoring-network` isolation; Loki/Promtail pinned digests; `.env` bootstrap + CI boundary tests | [../setup/MONITORING.md](../setup/MONITORING.md) |
| **3** | Hardened base images | `infrastructure/images/` | Digest-pinned Postgres/Redis/Grafana Dockerfiles; shared Postgres build; manifest + `validate-hardened-images.sh` CI | [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) |
| **4** | SVC (license server) | `projects/svc/` | License lookup requires app API key; CSRF bypass fixed; desktop OAuth PKCE; portal routes `PORTAL_API_KEY`-only; webhook `processed` flag fix; app key regenerate UI | [/vps/projects/svc/docs/security/SECURITY.md](/vps/projects/svc/docs/security/SECURITY.md) |
| **5** | Portal (storefront) | `projects/portal/` | `GET /api/download/:appId` → 405; `getPublicApp()` on public API; checkout/download/account rate limits; `PORTAL_API_KEY` startup validation | [/vps/projects/portal/README.md](/vps/projects/portal/README.md) |
| **6** | ETP (Email to Print) | `projects/api/` | Print-history IDOR fix (`X-User-Email` scoping); per-user SVC license gate (fail-closed); Postgres `env_file`-only password; idempotent sync | [ETP_DESKTOP_CLIENT_FOLLOWUP.md](./ETP_DESKTOP_CLIENT_FOLLOWUP.md), [/vps/projects/api/README.md](/vps/projects/api/README.md) |
| **7** | GrowPlan | `projects/growplan/` | `requireLicense` on paid routes; authenticated region mutations; RLS + optional MFA; export authorization; compose/env fail-closed patterns | [/vps/projects/growplan/docs/security/SECURITY.md](/vps/projects/growplan/docs/security/SECURITY.md) |
| **8** | Timekeeper | `projects/timekeeper/` | `FF_SELF_SERVE_SIGNUP=false` in prod; export tier gates; `token_version` on password reset; kiosk pairing rate limits; fail-closed `requireFeature` | [/vps/projects/timekeeper/docs/api/CORE_API_CONTRACT.md](/vps/projects/timekeeper/docs/api/CORE_API_CONTRACT.md), [/vps/projects/timekeeper/docs/policy/FEATURE_TIER_MATRIX.md](/vps/projects/timekeeper/docs/policy/FEATURE_TIER_MATRIX.md) |
| **9** | TasQuantum (marketing) | `projects/tasquantum/` | IP rate limits on contact/careers; PDF magic-byte + 10MB cap; input sanitization; `RESEND_API_KEY` via `env_file` only; non-root Node runtime; custom domain `www.tasquantum.com` | [/vps/projects/tasquantum/docs/VPS_DEPLOY.md](/vps/projects/tasquantum/docs/VPS_DEPLOY.md) |
| **10** | Deploy wiring + secrets | `environments/production/projects/*` | Per-project compose + `env.production` (Portal: `.env`); secrets gitignored; `verify-compose-secrets.sh` + `verify-runtime-secrets.sh`; no bare `${SECRET}` in compose `environment:` | [PROJECT_STANDARDS.md](./PROJECT_STANDARDS.md), [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md) §3.2 |

**Status snapshot:** [VPS_STATUS.md](/vps/VPS_STATUS.md) § Recent Changes (2026-06) lists per-layer bullets.

---

## SVC licensing wiring (production, 2026-06-07)

| Product | SVC `app_id` | `LICENSE_SERVER_APP_API_KEY` in API container | License check to SVC |
|---------|--------------|-----------------------------------------------|----------------------|
| `growplan` | `growplan` | Set via `env.production` (`env_file` only — not compose `environment:`) | 200; paid routes gated by `requireLicense` (Layer 7, 2026-06-07) |
| `timekeeper` | `timekeeper` (`GV_APP_ID`) | Set via `env.production` | 200 (regenerated 2026-06-07); DB-hybrid feature gates + `verify-worker` svc sync (Layer 8 security hardening, 2026-06-07) |
| `etp` | `etp` | Set via `env.production` (`LICENSE_SERVER_APP_API_KEY` + `X-User-Email` scoping) | Per-user license gate on print-history API (Layer 6, 2026-06-07) |
| `portal` | — | Uses `PORTAL_API_KEY` (not app key) | Server-side only (Layer 5 hardening, 2026-06-07) |

**Compose pitfalls (documented):** growplan Redis uses `$$REDIS_PASSWORD` in `command`/healthcheck; licensed product API secrets (`JWT_*`, `LICENSE_SERVER_*`, `NCDC_API_KEY`, etc.) must stay in `env.production` only — never `environment: ${VAR}` (empty host substitution clears `env_file`); growplan and etp Postgres do not set `POSTGRES_PASSWORD` in compose `environment:` — see [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md) §3.2. Run `/vps/scripts/verify-runtime-secrets.sh production` after deploy.

**Layer security references (2026-06-07):**

| Layer | Doc |
|-------|-----|
| 1 — Reverse proxy | [../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md) |
| 2 — Monitoring | [../setup/MONITORING.md](../setup/MONITORING.md) |
| 3 — Hardened images | [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) |
| 4 — SVC | [/vps/projects/svc/docs/security/SECURITY.md](/vps/projects/svc/docs/security/SECURITY.md), [/vps/projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md](/vps/projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md) |
| 5 — Portal | [/vps/projects/portal/README.md](/vps/projects/portal/README.md) |
| 6 — ETP | [ETP_DESKTOP_CLIENT_FOLLOWUP.md](./ETP_DESKTOP_CLIENT_FOLLOWUP.md), [/vps/projects/api/README.md](/vps/projects/api/README.md) |
| 7 — GrowPlan | [/vps/projects/growplan/docs/security/SECURITY.md](/vps/projects/growplan/docs/security/SECURITY.md) |
| 8 — Timekeeper | [/vps/projects/timekeeper/docs/api/CORE_API_CONTRACT.md](/vps/projects/timekeeper/docs/api/CORE_API_CONTRACT.md), [/vps/projects/timekeeper/docs/policy/FEATURE_TIER_MATRIX.md](/vps/projects/timekeeper/docs/policy/FEATURE_TIER_MATRIX.md), [/vps/projects/timekeeper/docs/operations/MONITORING_AND_DATA_TRANSFER_RUNBOOK.md](/vps/projects/timekeeper/docs/operations/MONITORING_AND_DATA_TRANSFER_RUNBOOK.md) |
| 9 — TasQuantum | [/vps/projects/tasquantum/docs/VPS_DEPLOY.md](/vps/projects/tasquantum/docs/VPS_DEPLOY.md) |
| 10 — Deploy wiring | [PROJECT_STANDARDS.md](./PROJECT_STANDARDS.md), [NON_STANDARD_COMPOSE_LAYOUTS.md](./NON_STANDARD_COMPOSE_LAYOUTS.md), [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md) §3.2 |

**Desktop OAuth:** ETP and other desktop apps must send `code_verifier` on `/api/auth/oauth-tokens` — see [/vps/projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md](/vps/projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md).

**ETP desktop follow-up (2026-06-07):** Print-history sync requires `X-User-Email`; SVC app key for `etp` was rotated — see [ETP_DESKTOP_CLIENT_FOLLOWUP.md](./ETP_DESKTOP_CLIENT_FOLLOWUP.md).

---

## Related

- [VPS_SYSTEM_OVERVIEW.md](VPS_SYSTEM_OVERVIEW.md) — onboarding spine (links here for live inventory)
- [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md) — Portal + SVC for new licensed products
- [../setup/VPS_STACK_STRUCTURE.md](../setup/VPS_STACK_STRUCTURE.md) — directory layout
