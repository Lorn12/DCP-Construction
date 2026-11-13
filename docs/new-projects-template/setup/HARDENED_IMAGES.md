# Hardened Base Images (Postgres / Redis / Grafana)

**Last Updated:** 2026-06-07  
**Verified against:** `infrastructure/images/` (Dockerfiles, production compose consumers)

Thin Dockerfiles that digest-pin upstream bases and apply OS security updates before product stacks build `vps-*:patched` images.

**VPS stack walk:** Layer 3 — full index in [../integration/VPS_PROJECTS_REGISTRY.md](../integration/VPS_PROJECTS_REGISTRY.md) § Security stack walk (layers 1–10).

**Related:** [PRODUCTION_HARDENING_PASS.md](../integration/PRODUCTION_HARDENING_PASS.md) · [MONITORING.md](MONITORING.md) (Grafana consumer) · [../integration/VPS_PROJECTS_REGISTRY.md](../integration/VPS_PROJECTS_REGISTRY.md)

---

## Location and images

| Directory | Output image | Upstream base | Patch step |
|-----------|--------------|---------------|------------|
| `infrastructure/images/postgres/` | `vps-postgres15:patched`, `vps-postgres16:patched`, `vps-postgres17:patched` | Debian `postgres:{15,16,17}` (digest-pinned) | `apt-get dist-upgrade` |
| `infrastructure/images/redis8/` | `vps-redis8:patched` | `redis:8-alpine` (digest-pinned) | `apk upgrade` |
| `infrastructure/images/grafana/` | `vps-grafana:12.4.2-patched` | `grafana/grafana:12.4.2` (digest-pinned) | `apk upgrade` |

Digest pins and Trivy baselines: `.security/pinned-images.manifest.yaml`.

### What `:patched` means (and does not mean)

| Image family | `:patched` delivers | Still open (tracked) |
|--------------|---------------------|----------------------|
| **Redis 8** | Alpine package refresh; current baseline **0 HIGH / 0 CRITICAL** | Re-scan after each rebuild |
| **Grafana** | Alpine package refresh | pgx critical until upstream Grafana release (see manifest notes) |
| **Postgres 15/16/17** | Debian package refresh on digest-pinned official image | perl + gosu/stdlib criticals until upstream `postgres` image updates (waivers in `.security/vulnerability-exceptions.csv`) |

`:patched` is **not** a guarantee of zero critical CVEs for Postgres/Grafana — it is a **controlled rebuild layer** with pinned upstream digests and documented baselines.

### Generator vs production

| Area | Generator baseline (`templates/new-project-template/`) | Production hardened |
|------|------------------------------------------------------|---------------------|
| Postgres | `postgres:15-alpine` (stock tag) | `vps-postgres15:patched` built from **Debian** `postgres:15` digest + `infrastructure/images/postgres/` |
| Redis | `redis:7-alpine` (if used) | `vps-redis8:patched` from `infrastructure/images/redis8/` |

---

## Production consumers

| Patched image | Built from | Used by (production compose) |
|---------------|------------|------------------------------|
| `vps-postgres15:patched` | `postgres` + PG15 digest | `etp`, `svc` |
| `vps-postgres16:patched` | `postgres` + PG16 digest | `timekeeper` |
| `vps-postgres17:patched` | `postgres` + PG17 digest | `growplan` |
| `vps-redis8:patched` | `redis8/Dockerfile` | `growplan` |
| `vps-grafana:12.4.2-patched` | `grafana/Dockerfile` | `infrastructure/monitoring/` |

Portal and TasQuantum do not run local Postgres/Redis — they use platform services or no DB.

### Compose pattern (Postgres)

```yaml
postgres:
  build:
    context: ../../../../infrastructure/images/postgres
    dockerfile: Dockerfile
    args:
      BASE_IMAGE: postgres@sha256:<digest-from-manifest>
  image: vps-postgres15:patched
```

Major version and digest must match an entry in `pinned-images.manifest.yaml` (`postgres15_base`, etc.).

---

## Operations

### Bootstrap / rebuild all patched images

```bash
bash /vps/scripts/rebuild-production-images-for-cve-refresh.sh
# Then redeploy each affected stack:
cd /vps/environments/production/projects/<project>
docker compose -f <compose-file> up -d
```

`rebuild-production-images-for-cve-refresh.sh` runs `docker compose build --pull` for reverse-proxy, monitoring, etp, svc, growplan, portal, and timekeeper.

### Validate configs and Dockerfiles (CI / offline)

```bash
bash /vps/scripts/ci/validate-hardened-images.sh
```

Checks manifest ↔ Dockerfile ↔ compose `BASE_IMAGE` alignment and builds CI smoke tags.

### Smoke-test running containers

```bash
bash /vps/scripts/ci/test-hardened-images-smoke.sh
```

Verifies production DB/cache/Grafana containers use `vps-*:patched` images, rejects orphan stock `grafana/grafana` containers, and runs `pg_isready` / Redis TLS ping where applicable. Included in `health-check.sh`.

### Upstream upgrade workflow

```bash
bash /vps/scripts/check-upstream-vuln-upgrades.sh
# When a LOWER RISK candidate appears:
bash /vps/scripts/apply-pinned-image-upgrade.sh postgres-15 15-bookworm
bash /vps/scripts/apply-pinned-image-upgrade.sh redis 8-alpine
bash /vps/scripts/apply-pinned-image-upgrade.sh grafana 12.4.3
# Rebuild + redeploy, then:
SCAN_SCOPE=running bash /vps/scripts/scan-images.sh
bash /vps/scripts/ci/test-hardened-images-smoke.sh
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `validate-hardened-images.sh` BASE_IMAGE mismatch | Compose digest drifted from manifest | Run `apply-pinned-image-upgrade.sh` or sync digest from manifest |
| Trivy criticals on Postgres after rebuild | Upstream gosu/perl (expected) | Track waivers; bump base digest when upstream publishes |
| Orphan `grafana/grafana:*` container | Manual `docker run` / test leftover | `docker rm -f <name>` — only `vps-grafana` should run |
| Redis build OK but app cannot connect | TLS/certs in compose, not image | See growplan compose + `infrastructure/ssl/redis/` |
| Redis restart loop / unhealthy | Password empty in `command` or healthcheck — Compose expanded `$REDIS_PASSWORD` from host shell at parse time | Use `$$REDIS_PASSWORD` in `command` and healthcheck so the container shell reads `env_file` at runtime (see growplan compose); redeploy with `docker compose --env-file env.production up -d` |

---

## CI

GitHub Actions (`security.yml`):

- `hardened-images` — runs `validate-hardened-images.sh`
- `docker-build-test` — includes timekeeper (builds `vps-postgres16:patched`)
