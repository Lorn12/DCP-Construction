# Project Standards

**Last Updated:** 2026-06-07

## Naming

- Project: lowercase-hyphen format (example `billing-system`)
- Containers: `<project>-<service>-<envSuffix>` (example `billing-system-api-prod`)
- SVC/Portal app ID: same as project name unless documented exception
- Licensing env vars (new projects): `LICENSE_SERVER_APP_ID`, `LICENSE_SERVER_APP_API_KEY`

## Config and Secrets

- Runtime config must come from environment variables.
- Never commit real secrets.
- If `.env` exists, keep it synchronized with `env.<environment>`.
- Secrets load from `env_file` only — do not put secrets in compose `environment:` blocks with defaults (see `/vps/.cursor/rules/17-docker-compose-secrets.md`).
- Run `/vps/scripts/verify-compose-secrets.sh` and `/vps/scripts/verify-runtime-secrets.sh production` before production handoff.

## Build Context

- New generated project compose files default to `build.context: ../../../../projects/<project-name>`.
- The expected default code location on the VPS is `/vps/projects/<project-name>`.
- If the app repository lives elsewhere, update `build.context` before deploying.

## Dockerfile (App Repository)

- Official base image with **pinned version** (never `latest` in production)
- **Non-root user** — for `node:*-alpine`, use the built-in `USER node` (do not `adduser -u 1000`; UID 1000 is already taken)
- **HEALTHCHECK** — probe `http://127.0.0.1:<port>/health` (not `localhost`; Alpine often resolves `localhost` to IPv6 while the app listens on IPv4)
- For Node.js 18+, prefer a `node -e "fetch('http://127.0.0.1:...')..."` health command (Alpine Node images may not include `wget`)
- **EXPOSE** the application port
- Multi-stage build recommended for Node.js/TypeScript

Example (Node.js Alpine):

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
USER node
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4001/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
```

Generated compose health checks use the same `127.0.0.1` + `node` pattern. `/vps/scripts/health-check.sh` probes `127.0.0.1` as well.

## Health

- Required endpoint: `/health` or `/api/health` returning HTTP 200 when healthy.
- App should listen on `0.0.0.0` (not only `127.0.0.1`) inside the container.

## Routing

- Caddy path-based routing on shared domains.
- Use generated `caddy.<env>.snippet.txt` outputs for new routes.
- Custom domains require explicit Caddy site block + Portal `appUrl`.

## Networks

- API (and any reverse-proxy-facing service) must be on **both**:
  - project network (`<project>-prod-network`)
  - environment network (`production-network`, `testing-network`, etc.)

## Licensing/Portal

Every licensed product on this VPS uses the shared Portal + SVC platform:

- Portal hosts `store.graspvisual.com/{appId}` landing and pricing pages
- SVC owns trials, subscriptions, checkout, and license validation
- Product backends call SVC with `LICENSE_SERVER_APP_API_KEY` + `X-App-ID: LICENSE_SERVER_APP_ID` on `GET /api/license/:email` (401 without valid app key)
- Portal calls SVC with `PORTAL_API_KEY` only (checkout, trials, `/api/portal/*`, `/api/subscriptions/*`)
- Portal public API routes use `getPublicApp()` — hidden storefront apps are not exposed on `/api/*`
- Desktop downloads are **POST-only** to `/api/download/{appId}` (email-gated trial); direct GET returns 405
- Portal IP rate limits: download POST (10/hr), checkout (20/hr), enterprise contact (5/hr), account portal (10/hr)
- Desktop OAuth clients must pass `code_verifier` on `GET /api/auth/oauth-tokens` — see `projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md`
- Store `LICENSE_SERVER_APP_API_KEY` in `env.production` only; do not override via compose `environment: ${LICENSE_SERVER_APP_API_KEY:-}` (empty host substitution clears `env_file` values)
- Same rule for `POSTGRES_PASSWORD` on Postgres services — do not use `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` in compose (etp fix, 2026-06-07)
- Quote env values that contain `$` with single quotes when using `source env.production` in shell scripts
- Lost app keys: regenerate in SVC admin (App Details → API) or `POST /api/admin/apps/:appId/regenerate-api-key`, then update product env and redeploy
- **Per-user API scoping (ETP reference):** user-bound routes require `X-User-Email` matching request `user_email` plus active SVC license — see `projects/api/src/middleware/user-scope.js` and [ETP_DESKTOP_CLIENT_FOLLOWUP.md](ETP_DESKTOP_CLIENT_FOLLOWUP.md)

Reference:

- [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md)

## Security and Hardening

Generator output is a **baseline** scaffold. Before production launch:

- Apply [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md)
- Use patched images from `/vps/infrastructure/images/` where applicable — see [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md) for digest pins, rebuild, and validation scripts
- Add container hardening (`security_opt`, `cap_drop`, `read_only`, `tmpfs`)
- Run `/vps/scripts/check-public-surface.sh`
- Update Portal compliance pages for new payments/data collection

VPS-wide security reference: `/vps/docs/security/SECURITY_HARDENING.md`

## Verification Before Handoff

- `/vps/scripts/health-check.sh <environment> <project-name>`
- `/vps/scripts/verify-all-projects.sh --detailed --check-containers`
- `/vps/scripts/verify-compose-secrets.sh`
- `/vps/scripts/verify-runtime-secrets.sh production`
- `/vps/scripts/check-public-surface.sh`
- `docker compose config` with real env files
