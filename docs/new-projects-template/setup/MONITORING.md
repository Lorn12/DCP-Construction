# Monitoring Stack (Grafana / Loki / Promtail)

**Last Updated:** 2026-06-07  
**Verified against:** `infrastructure/monitoring/` (compose, configs, Grafana provisioning)

Centralized log aggregation and dashboards for the VPS. Grafana is exposed at `https://app.graspvisual.com/grafana/` behind Caddy edge auth.

**VPS stack walk:** Layer 2 — full index in [../integration/VPS_PROJECTS_REGISTRY.md](../integration/VPS_PROJECTS_REGISTRY.md) § Security stack walk (layers 1–10).

**Related:** [REVERSE_PROXY.md](REVERSE_PROXY.md) (Grafana edge auth) · [../integration/AVAILABLE_SERVICES.md](../integration/AVAILABLE_SERVICES.md) · [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md)

---

## Location and runtime

| Item | Value |
|------|--------|
| Directory | `/vps/infrastructure/monitoring/` |
| Compose file | `docker-compose.yml` |
| Network | `monitoring-network` only (Grafana is **not** on `production-network`; Caddy joins `monitoring-network` to route `/grafana/*`) |

### Services

| Compose service | Container | Image | Purpose |
|-----------------|-----------|-------|---------|
| `loki` | `vps-loki` | `grafana/loki@sha256:191d4f…` (3.7.2) | Log storage and query API |
| `promtail` | `vps-promtail` | `grafana/promtail@sha256:6cfa64…` (3.6.8) | Log collection agent |
| `grafana` | `vps-grafana` | `vps-grafana:12.4.2-patched` | Dashboards and Explore UI |

Grafana is built from `infrastructure/images/grafana/Dockerfile` (digest-pinned `grafana/grafana:12.4.2` + `apk upgrade`). See [HARDENED_IMAGES.md](HARDENED_IMAGES.md).

Image pins and Trivy baselines: `.security/pinned-images.manifest.yaml`. Upgrade via `scripts/apply-pinned-image-upgrade.sh`.

Container hardening (all three): `read_only: true`, `no-new-privileges`, `cap_drop: ALL`, resource limits in compose.

---

## Access model (two layers)

Grafana at `https://app.graspvisual.com/grafana/` requires **two** authentication steps:

| Layer | Where | Credentials |
|-------|--------|-------------|
| **1. Caddy edge** | Reverse proxy `basic_auth` on `/grafana/*` | `GRAFANA_EDGE_USER` / `GRAFANA_EDGE_PASSWORD` in `/vps/infrastructure/reverse-proxy/.env` |
| **2. Grafana login** | Grafana UI (`admin` user) | `GRAFANA_ADMIN_PASSWORD` in `/vps/infrastructure/monitoring/.env` |

Bootstrap edge credentials: `/vps/scripts/ensure-reverse-proxy-env.sh`  
Bootstrap Grafana admin password: `/vps/scripts/ensure-monitoring-env.sh`

Rotate secrets:

```bash
/vps/scripts/rotate-secrets.sh --secret GRAFANA_EDGE_PASSWORD --env reverse-proxy
cd /vps/infrastructure/reverse-proxy && docker compose restart caddy

/vps/scripts/rotate-secrets.sh --secret GRAFANA_ADMIN_PASSWORD --env monitoring
cd /vps/infrastructure/monitoring && docker compose restart grafana
```

Verify edge auth returns 401 without credentials:

```bash
curl -skI --resolve app.graspvisual.com:443:127.0.0.1 https://app.graspvisual.com/grafana/ | head -3
# Expect: HTTP/2 401
```

---

## Environment (`.env`)

Required before first start. Bootstrap:

```bash
/vps/scripts/ensure-monitoring-env.sh
```

| Variable | Purpose |
|----------|---------|
| `GRAFANA_ADMIN_PASSWORD` | Grafana `admin` user password (`GF_SECURITY_ADMIN_PASSWORD`) |

`.env` is gitignored. Copy from `.env.example` if bootstrapping manually. Compose fails fast if `GRAFANA_ADMIN_PASSWORD` is unset (`:?` syntax).

Grafana sub-path settings (set in compose, not `.env`):

- `GF_SERVER_ROOT_URL=https://app.graspvisual.com/grafana/`
- `GF_SERVER_SERVE_FROM_SUB_PATH=true`
- Sign-up disabled; analytics disabled

---

## Log collection (Promtail)

Config: `promtail-config.yml`

| Job | Source | Labels |
|-----|--------|--------|
| `docker` | Docker socket (`/var/run/docker.sock`) | `container`, `logstream`, `network`; JSON `level`/`service` labels only for known JSON-logging app containers |
| `caddy-files` | `/caddy-logs/*.log` (reverse-proxy volume) | Legacy file retention; **primary** Caddy logs are container stdout → `docker` job on `vps-reverse-proxy` |
| `auth` | `/var/log/auth.log` | SSH/sudo events |
| `fail2ban` | `/var/log/fail2ban.log` | Ban events |

Promtail pushes to `http://loki:3100/loki/api/v1/push`.

After config changes:

```bash
cd /vps/infrastructure/monitoring
docker compose restart promtail
```

---

## Log storage (Loki)

Config: `loki-config.yml`

| Setting | Value |
|---------|--------|
| Retention | 30 days (`limits_config.retention_period`) |
| Storage | Filesystem (`loki_data` volume → `vps-loki-data`) |
| Schema | TSDB v13 |
| Auth | Disabled (internal network only) |

Loki is **not** exposed publicly. Query only via Grafana on the internal `monitoring-network`.

Verify ingestion from Grafana container:

```bash
docker exec vps-grafana wget -qO- http://loki:3100/loki/api/v1/labels
```

Example LogQL in Grafana Explore:

```logql
{job="docker", container="etp-api-prod"}
{job="docker", container="vps-reverse-proxy"} | json
{job="fail2ban"} |= "Ban"
```

---

## Grafana provisioning

Auto-provisioned datasource: `grafana/provisioning/datasources/loki.yml`

- Name: `Loki`
- URL: `http://loki:3100` (Grafana plugin appends `/loki/api/v1/...`)
- Default datasource; not editable in UI

No dashboards are provisioned from repo — create/save in Grafana UI (persisted in `grafana_data` volume).

---

## Alerting

Example LogQL alert rules live in `infrastructure/monitoring/alerting-rules.example.yml` (not mounted in production).

**Rules are not evaluated today.** Deploying alerts requires a Loki `ruler` block and Alertmanager. Do not assume alerts fire until that stack is wired.

---

## Network isolation

Grafana runs **only** on `monitoring-network`. Product containers on `production-network` cannot reach `vps-grafana:3000`.

Caddy joins `monitoring-network` (external) in addition to environment networks so it can proxy `/grafana/*` without exposing Grafana to app containers.

Verify boundary after changes:

```bash
/vps/scripts/ci/test-monitoring-boundary.sh
```

---

## Standard operations

### Start / rebuild

```bash
/vps/scripts/ensure-monitoring-env.sh
cd /vps/infrastructure/monitoring
docker compose build --pull grafana
docker compose pull loki promtail
docker compose up -d
cd /vps/infrastructure/reverse-proxy
/vps/scripts/ensure-reverse-proxy-env.sh
docker compose up -d
/vps/scripts/ci/test-monitoring-boundary.sh
```

### Status and logs

```bash
cd /vps/infrastructure/monitoring
docker compose ps
docker compose logs grafana
docker compose logs loki
docker compose logs promtail
docker exec vps-grafana wget -qO- http://localhost:3000/api/health
```

Or via health-check script:

```bash
/vps/scripts/health-check.sh all etp
# Includes "Checking Monitoring Stack" section
```

### Backup

Monitoring volumes included in nightly backup:

```bash
/vps/scripts/backup.sh production monitoring
# Backs up vps-loki-data, vps-grafana-data
```

See `scripts/lib/backup-manifest.sh`.

---

## Resource usage (typical)

From runtime reports, monitoring is among the top memory consumers on the host (~180 MiB each for Loki and Grafana, ~60 MiB Promtail). Limits: Loki/Grafana 512M, Promtail 256M.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| 401 at `/grafana/` | Expected without edge credentials — use `GRAFANA_EDGE_*` from reverse-proxy `.env` |
| Grafana login fails | `GRAFANA_ADMIN_PASSWORD` in monitoring `.env`; restart Grafana after change |
| No logs in Explore | Promtail running? `docker logs vps-promtail`; Loki labels: `docker exec vps-grafana wget -qO- http://loki:3100/loki/api/v1/labels` |
| Grafana can't reach Loki | Both on `monitoring-network`? `docker network inspect monitoring-network` |
| Promtail "could not inspect container" | Normal after container recreate; Promtail re-discovers targets within seconds |
| Prod app reaches Grafana internally | Boundary broken — Grafana must not be on `production-network` | `docker network inspect vps-grafana`; run `test-monitoring-boundary.sh` |

---

## CI and image upgrades

- GitHub Actions job `monitoring-config` runs `scripts/ci/validate-monitoring-config.sh` (Loki `-verify-config`, Promtail `-check-syntax`, compose config).
- Runtime boundary + ingestion smoke: `scripts/ci/test-monitoring-boundary.sh` (also called from `health-check.sh`).
- Weekly candidate refresh: `scripts/candidate-refresh-check.sh`
- Vulnerability scan baselines: `.security/pinned-images.manifest.yaml`
- Known exception: Grafana image has one tracked critical CVE (pgx) — see `.security/vulnerability-exceptions.csv`

---

## After deploy

Project deploys do not restart monitoring automatically. If you change Promtail/Loki/Grafana configs or rotate passwords, restart the affected service:

```bash
cd /vps/infrastructure/monitoring && docker compose restart <service>
```

Reverse proxy restart (after deploy) does not affect log ingestion — Promtail reads Docker logs independently.
