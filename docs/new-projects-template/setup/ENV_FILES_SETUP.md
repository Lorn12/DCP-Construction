# Environment Files Setup

**Last Updated:** 2026-10-31

## Per Project/Environment

For each enabled environment:

```bash
cd /vps/environments/<environment>/projects/<project>
cp env.<environment>.example env.<environment>
nano env.<environment>
```

If `.env` is used in that folder, sync it with the active env file:

```bash
cp env.<environment> .env
```

## Quick Validation

```bash
docker compose --env-file env.<environment> config
```

Validate all project env files (includes monitoring infrastructure check):

```bash
/vps/scripts/verify-env-files.sh <project>
```

## Infrastructure (platform) env files

These live under `/vps/infrastructure/`, not in project deploy folders. Bootstrap before first start:

| File | Variables | Bootstrap script | Reference |
|------|-----------|-------------------|-----------|
| `infrastructure/reverse-proxy/.env` | `GRAFANA_EDGE_USER`, `GRAFANA_EDGE_PASSWORD` | `/vps/scripts/ensure-reverse-proxy-env.sh` | [REVERSE_PROXY.md](REVERSE_PROXY.md) |
| `infrastructure/monitoring/.env` | `GRAFANA_ADMIN_PASSWORD` | `/vps/scripts/ensure-monitoring-env.sh` | [MONITORING.md](MONITORING.md) |

Both `.env` files are gitignored. Copy from `.env.example` in each directory if bootstrapping manually. Placeholder passwords (`CHANGE_THIS`, `changeme`) are rejected by `verify-env-files.sh`.

## Current production env files (2026-10-31)

Compose `env_file` is **not** the same name for every project.

| Project | File compose loads |
|---------|--------------------|
| `etp`, `growplan`, `timekeeper`, `tasquantum`, `trading-bot-relay`, `svc`, `abpd` | `environments/production/projects/<name>/env.production` |
| `portal` | `environments/production/projects/portal/.env` |
| `party-captions-bot` | `environments/production/projects/party-captions-bot/.env` |
| reverse proxy | `infrastructure/reverse-proxy/.env` |
| monitoring | `infrastructure/monitoring/.env` |

SVC uses `env_file: env.${ENVIRONMENT:-production}` — production is `env.production`, not `.env`. Portal and party-captions-bot are the `.env` exceptions.

Example files (`env.production.example` or `.env.example`) sit next to the real files and are safe to commit. Real env files are gitignored.

## License-Aware Projects

Set these for project-to-SVC validation flows:

- `LICENSE_SERVER_URL`
- Project app-id env (for `X-App-ID` usage)
- Project-specific SVC key (`LICENSE_SERVER_APP_API_KEY`)

**Compose safety:** Keep `LICENSE_SERVER_*` and `POSTGRES_PASSWORD` in `env.production` only — do not repeat them in compose `environment:` with `${VAR}` host substitution (empty host clears `env_file`). See [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md) §3.2.

**Values with `$`:** SVC app keys (bcrypt/base64) often contain `$`. Use single quotes in `env.production` (`LICENSE_SERVER_APP_API_KEY='...'`) so bash `source` does not corrupt the value. Store the **plain** key from SVC registration/regenerate, not the DB hash.

For contract boundaries, see:

- `/vps/docs/integration/LICENSING_AND_STORE_INTEGRATION.md`
- ETP desktop follow-up (print-history headers): `/vps/docs/integration/ETP_DESKTOP_CLIENT_FOLLOWUP.md`
