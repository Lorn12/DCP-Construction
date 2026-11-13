# Available Services

**Last Updated:** 2026-10-31

## Active VPS Service Surface

- **Caddy reverse proxy** — TLS termination, routing, request hardening (`infrastructure/reverse-proxy/`, compose service `caddy`, container `vps-reverse-proxy`). See [../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md).
- PostgreSQL (project-scoped; production hardened stacks use `vps-postgres*:patched` from `infrastructure/images/postgres/`)
- Redis (optional, project-scoped; hardened stacks use `vps-redis8:patched` from `infrastructure/images/redis8/`)
- App services (API/frontend/worker patterns)
- **Monitoring stack** — Grafana, Loki, Promtail (`infrastructure/monitoring/`). See [../setup/MONITORING.md](../setup/MONITORING.md).
- **Hardened base images** — digest-pinned Postgres/Redis/Grafana rebuild layer (`infrastructure/images/`). See [../setup/HARDENED_IMAGES.md](../setup/HARDENED_IMAGES.md).

### Grafana access model

Grafana dashboards: `https://app.graspvisual.com/grafana/`

Two authentication layers:

1. **Caddy edge** — `basic_auth` on `/grafana/*` using `GRAFANA_EDGE_USER` / `GRAFANA_EDGE_PASSWORD` from `/vps/infrastructure/reverse-proxy/.env` (bootstrap: `/vps/scripts/ensure-reverse-proxy-env.sh`)
2. **Grafana login** — `admin` user with `GRAFANA_ADMIN_PASSWORD` in `/vps/infrastructure/monitoring/.env` (bootstrap: `/vps/scripts/ensure-monitoring-env.sh`)

Log query examples and ops commands: [../setup/MONITORING.md](../setup/MONITORING.md).

Host-level (not compose, not for product onboarding): UFW, Fail2ban, WireGuard `wg0`, ASA-edge UDP DNAT — [../setup/HOST_EDGE.md](../setup/HOST_EDGE.md).

## Not in Active Onboarding

- n8n (decommissioned from active baseline)

Reference:

- `/vps/docs/security/N8N_DECOMMISSION_REFERENCE_TRACKER.md`

## Onboarding Entry

- `ADDING_NEW_PROJECTS.md`
