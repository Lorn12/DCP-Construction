# Project Structure Requirements

**Last Updated:** 2026-05-27

## Required in the App Repository

- `Dockerfile` (non-root user, pinned base image, HEALTHCHECK)
- `.env.example` (all variables documented, no real secrets)
- `README.md`
- Health endpoint at `/health` or `/api/health`
- SVC license validation in backend (if commercial/licensed product)

## Required Licensing Env (Commercial Products)

Generated VPS env examples include:

- `LICENSE_SERVER_URL`
- `LICENSE_SERVER_APP_ID` (matches SVC + Portal app ID)
- `LICENSE_SERVER_APP_API_KEY` (from SVC registration)

See [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md).

## Generated on VPS

Project scaffolding appears under:

- `/vps/environments/<environment>/projects/<project>/`

Expected generated outputs:

- `docker-compose.yml` (baseline; harden before production — see [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md))
- `env.<environment>.example`
- `caddy.<environment>.snippet.txt`

Default app code location: `/vps/projects/<project-name>`

## Platform Integration (Licensed Products)

Also required on the VPS (not in app repo alone):

- SVC app registration (`/svc/admin` or admin API)
- Portal app config: `portal/src/config/apps/<appId>.ts`
- Caddy routing for main product URL (path-based or custom domain)
- Portal compliance page updates if product collects payments or new data

## Routing Source of Truth

- `/vps/infrastructure/reverse-proxy/Caddyfile`

## Related

- [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md)
- [ADDING_NEW_PROJECTS.md](ADDING_NEW_PROJECTS.md)
