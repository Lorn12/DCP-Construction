# Reverse Proxy (Caddy)

**Last Updated:** 2026-10-31  
**Verified against:** `infrastructure/reverse-proxy/` (compose, Dockerfile, Caddyfile, scripts)

Single edge reverse proxy for all VPS environments. TLS termination, routing, request hardening, and Grafana edge authentication.

**VPS stack walk:** Layer 1 — full index in [../integration/VPS_PROJECTS_REGISTRY.md](../integration/VPS_PROJECTS_REGISTRY.md) § Security stack walk (layers 1–10).

**Related:** [SSL_CERTIFICATE_SETUP.md](SSL_CERTIFICATE_SETUP.md) · [../integration/CUSTOM_DOMAIN_AND_TLS.md](../integration/CUSTOM_DOMAIN_AND_TLS.md) · [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md)

---

## Location and runtime

| Item | Value |
|------|--------|
| Directory | `/vps/infrastructure/reverse-proxy/` |
| Compose file | `docker-compose.yml` |
| Compose **service name** | `caddy` (historically named `nginx`; use `caddy` in all new docs and commands) |
| Container name | `vps-reverse-proxy` |
| Image | `vps-reverse-proxy:latest` (built from `caddy:2.11.4-alpine`) |
| Process user | `caddy` (UID 1000, non-root) |
| Public ports | `80`, `443` |
| Config | `Caddyfile` → mounted at `/etc/caddy/Caddyfile` |
| TLS material | `ssl/{domain}/fullchain.pem` + `privkey.pem` → `/etc/caddy/ssl/` |
| ACME webroot | `certbot-webroot/` → `/var/www/certbot` |
| Logs | `logs/` (also JSON to container stdout) |
| Networks | `production-network`, `testing-network`, `development-network`, `monitoring-network` (external; Grafana routing) |

Container hardening (from `docker-compose.yml`): `read_only: true`, `no-new-privileges`, `cap_drop: ALL`, `cap_add: NET_BIND_SERVICE`, tmpfs for `/tmp`, `/data`, `/config`.

Health check (compose): `wget -qO- http://127.0.0.1/health | grep -q healthy` — `:80` responds `healthy\n` for path `/health`.

---

## Environment (`.env`)

Required before first start. Bootstrap:

```bash
/vps/scripts/ensure-reverse-proxy-env.sh
```

| Variable | Purpose |
|----------|---------|
| `CERTBOT_EMAIL` | Let's Encrypt notification email |
| `VPS_ROOT` | Repo root (default `/vps`) |
| `GRAFANA_EDGE_USER` | Caddy `basic_auth` username for `/grafana/*` (default `grafana-edge`) |
| `GRAFANA_EDGE_PASSWORD` | Plaintext password; hashed at container start by `docker-entrypoint.sh` |

`.env` is gitignored. Copy from `.env.example` if bootstrapping manually.

**Permissions:** `ensure-reverse-proxy-env.sh` sets `logs/` to UID 1000; `fullchain.pem` to `644`; `privkey.pem` to `640` with group `1000` (caddy GID in container) so the non-root `caddy` user can read keys without world-readable privkeys.

Rotate Grafana edge password:

```bash
/vps/scripts/rotate-secrets.sh --secret GRAFANA_EDGE_PASSWORD --env reverse-proxy
cd /vps/infrastructure/reverse-proxy && docker compose restart caddy
```

---

## Grafana edge authentication

On `app.graspvisual.com`, path `/grafana/*` is protected by Caddy `basic_auth` before traffic reaches Grafana.

```caddy
@grafana path /grafana/*
handle @grafana {
    basic_auth {
        {env.GRAFANA_EDGE_USER} {env.GRAFANA_EDGE_PASSWORD_HASH}
    }
    reverse_proxy vps-grafana:3000 { ... }
}
```

Users must pass **two** gates: Caddy edge credentials, then Grafana's own login (`admin` user; `GRAFANA_ADMIN_PASSWORD` in `/vps/infrastructure/monitoring/.env` — bootstrap: `/vps/scripts/ensure-monitoring-env.sh`). See [MONITORING.md](MONITORING.md).

Verify edge auth returns 401 without credentials:

```bash
curl -skI --resolve app.graspvisual.com:443:127.0.0.1 https://app.graspvisual.com/grafana/ | head -3
# Expect: HTTP/2 401
```

---

## Production upstreams

Verified by `/vps/scripts/verify-caddy-routes.sh`:

| Upstream | Port | Product / service |
|----------|------|-------------------|
| `svc-api-prod` | 4001 | SVC license server |
| `etp-api-prod` | 4001 | ETP API |
| `vps-grafana` | 3000 | Monitoring (Grafana) |
| `growplan-api-prod` | 5001 | GrowPlan API |
| `growplan-frontend-prod` | 80 | GrowPlan frontend |
| `portal-app-prod` | 3000 | Portal storefront |
| `gv-timekeeper-app` | 3000 | Timekeeper |
| `tasquantum-app-prod` | 3000 | TasQuantum |
| `abpd-app-prod` | 3000 | ABPD (Bellbottoms) |
| `trading-bot-relay-api-prod` | 4001 | Trading bot relay |
| `party-captions-bot` | 9476 / 9477 | Party Captions exchange / WebSocket |
| static `certbot-webroot/party-captions/` | files | Party Captions join + updates pages |

Path-based routes live under `app.graspvisual.com:443` (`/etp`, `/svc`, `/grafana`, `/trading-bot-relay`, `/party-captions`). Custom domains use separate site blocks (`growplan.app`, `time.graspvisual.com`, `store.graspvisual.com`, `tasquantum.com` + `www.tasquantum.com`, `abpd.graspvisual.com`). Testing/dev hosts serve landing HTML only. See [../integration/VPS_PROJECTS_REGISTRY.md](../integration/VPS_PROJECTS_REGISTRY.md).

---

## Standard operations

### Start / rebuild

```bash
/vps/scripts/ensure-reverse-proxy-env.sh
cd /vps/infrastructure/reverse-proxy
docker compose build --pull
docker compose up -d
```

### Validate config

Inside running container (requires `.env` with `GRAFANA_EDGE_PASSWORD`):

```bash
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
```

Offline / CI (pinned image, placeholder auth hash):

```bash
/vps/scripts/ci/validate-caddyfile.sh
```

### Restart after Caddyfile or cert changes

```bash
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose restart caddy
```

Or use shared helpers:

```bash
source /vps/scripts/lib/reverse-proxy-compose.sh
reverse_proxy_validate_config && reverse_proxy_restart
```

### Logs and status

```bash
cd /vps/infrastructure/reverse-proxy
docker compose ps
docker compose logs caddy
docker logs vps-reverse-proxy --tail 50
```

### Route verification

```bash
/vps/scripts/verify-caddy-routes.sh
```

Checks Caddyfile upstream directives and running container presence.

---

## TLS and certificates

Per-domain certs under `ssl/{domain}/`. Issued via Let's Encrypt webroot (`certbot-auto.sh`).

**Single domain:**

```bash
/vps/infrastructure/reverse-proxy/scripts/certbot-auto.sh app.graspvisual.com
```

**Multi-domain (primary name = cert directory name):**

```bash
/vps/infrastructure/reverse-proxy/scripts/certbot-auto.sh tasquantum.com www.tasquantum.com
```

**TasQuantum apex + www** (validates DNS before issuance):

```bash
/vps/scripts/setup-tasquantum-ssl.sh
```

Requires `tasquantum.com` and `www.tasquantum.com` A records pointing at this VPS. Cert installs to `ssl/tasquantum.com/`. Caddy serves both hostnames; apex redirects to `www`.

Bulk setup / renewal: [SSL_CERTIFICATE_SETUP.md](SSL_CERTIFICATE_SETUP.md), `/vps/scripts/setup-ssl-certificates.sh`, `/vps/scripts/renew-all-certificates.sh`, `/vps/scripts/verify-ssl.sh`.

---

## After project deploy

`/vps/scripts/deploy.sh` restarts the reverse proxy automatically to refresh Docker DNS resolution. If upstreams 502 after deploy:

```bash
cd /vps/infrastructure/reverse-proxy && docker compose restart caddy
```

---

## CI

GitHub Actions job `caddy-config` in `.github/workflows/security.yml` runs `/vps/scripts/ci/validate-caddyfile.sh` on every push/PR.

---

## Troubleshooting quick reference

| Symptom | Check |
|---------|--------|
| 502 Bad Gateway | Container on `production-network`? Upstream name matches compose `container_name`? Restart Caddy. |
| TLS / cert load error | `ls ssl/{domain}/`; run `ensure-reverse-proxy-env.sh` for pem permissions; validate config. |
| Caddy won't start | `GRAFANA_EDGE_PASSWORD` set? `docker logs vps-reverse-proxy` |
| Grafana 401 at edge | Expected without credentials; use `GRAFANA_EDGE_USER` / `GRAFANA_EDGE_PASSWORD` from `.env` |
| Config syntax error | `docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile` |

Full guide: [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md) § DNS resolution, SSL, reverse-proxy config.
