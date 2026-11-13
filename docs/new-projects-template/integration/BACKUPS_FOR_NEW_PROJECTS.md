# Backups for New Projects

**Audience:** VPS admin after first successful production deploy  
**Last Updated:** 2026-06-06  
**Verified against:** `scripts/lib/backup-manifest.sh`, `scripts/backup.sh`, `scripts/backup-all-production.sh`, `docs/maintenance/SCRIPT_USAGE_GUIDE.md`

Backup scope is **not** inferred from directory layout. It is defined in one place:

**`scripts/lib/backup-manifest.sh`**

`backup.sh`, `backup-all-production.sh`, `audit-backup.sh`, and `prune-deprecated-backups.sh` all source that file.

---

## What `backup.sh` does

```bash
/vps/scripts/backup.sh [production|testing|development] [project-name]
```

For each project it may:

1. `pg_dump` from the project's Postgres container (when applicable)
2. Archive named Docker volumes (project-specific list in the manifest)
3. Archive a host directory (e.g. `reverse-proxy` → `/vps/infrastructure/reverse-proxy`)
4. GPG-encrypt artifacts (recipient `VPS Backup`)
5. Apply 30-day retention patterns from the manifest

Output: `/vps/backups/<environment>/`

---

## Nightly production scope

`backup-all-production.sh` iterates `BACKUP_PROJECTS` from the manifest:

| Project | What is backed up |
|---------|-------------------|
| `etp` | **Email to Print** — DB dump + volume `etp-postgres-prod` (`etp-db-prod`, `etp-api-prod`; `app.graspvisual.com/etp`) |
| `svc` | DB dump + volume `svc-postgres-clean-prod` only |
| `growplan` | DB dump + `growplan-postgres-prod`, `growplan-redis-prod` |
| `timekeeper` | DB dump + `gv-timekeeper_gv_timekeeper_pgdata` |
| `monitoring` | Volumes `vps-loki-data`, `vps-grafana-data` (no DB) |
| `reverse-proxy` | Host tree only (no volumes) |

**Omitted from DB/volume backups** — `BACKUP_OMIT_PROJECTS`: `portal`, `tasquantum`, `abpd`, `party-captions`. Nightly `backup.sh` creates encrypted **deploy snapshots** (compose, config, and `env.production` / `.env` when present).

Off-site sync is separate: `backup-offsite.sh` (cron). Use `audit-backup.sh production` to verify local artifacts and remote sync status.

## Restore (one command)

```bash
# List restore points for one project
/vps/scripts/restore.sh production growplan --list

# Restore latest backup for one project (prompts for confirmation)
/vps/scripts/restore.sh production growplan --latest

# Restore entire production stack from latest backups
/vps/scripts/restore-all-production.sh --yes
```

Restore decrypts `.gpg` artifacts, replays DB dumps, repopulates Docker volumes, and redeploys stateless projects from deploy snapshots. See `docs/maintenance/SCRIPT_USAGE_GUIDE.md`.

---

## After onboarding a new VPS project

1. Deploy and confirm container/volume names.
2. Run a manual backup:

   ```bash
   /vps/scripts/backup.sh production <project-name>
   ```

3. Confirm non-trivial `.gpg` files under `/vps/backups/production/`.
4. **Edit `scripts/lib/backup-manifest.sh`** (not `backup-all-production.sh` directly):
   - Add the project name to `BACKUP_PROJECTS` (nightly order), **or** to `BACKUP_OMIT_PROJECTS` if stateless.
   - Extend `backup_manifest_resolve_db`, `backup_manifest_resolve_volumes`, and `backup_manifest_retention_patterns` if names are non-standard.
   - Update `backup_manifest_print_scope` for audit output.
5. Re-run `audit-backup.sh production` and confirm expected volumes match live Docker.
6. Run `/vps/scripts/verify-backup-coverage.sh` — fails if the project is missing from the manifest.
7. Cron: `setup-backup-cron.sh` (see `SCRIPT_USAGE_GUIDE.md`).

**Generator default** (no manifest change if names match):

| Assumption | Pattern |
|------------|---------|
| Postgres container | `{project-name}-db-prod` |
| DB user | `{project-name}_user` |
| DB name | `{project-name}_prod` |
| Docker volumes | `{project-name}-postgres-prod` (explicit in manifest for known projects) |

---

## Non-standard layouts

| Project | DB container | Volumes / notes |
|---------|--------------|-----------------|
| `timekeeper` | `gv-timekeeper-db` | `gv-timekeeper_gv_timekeeper_pgdata` |
| `growplan` | `growplan-db-prod` | Custom DB user `grow_plan_user` |
| `svc` | `svc-db-prod` | **Only** `svc-postgres-clean-prod` (supersedes old `svc-postgres-prod` / `svc-postgres-clean-production` orphans) |
| `etp` | `etp-db-prod` | Volume `etp-postgres-prod`; API code in `/vps/projects/api` () |
| `monitoring` | — | No DB; Loki + Grafana volumes |
| `reverse-proxy` | — | Host tree `/vps/infrastructure/reverse-proxy` |
| Generator default | `{project}-db-prod` | Add explicit volume names in manifest if not `{project}-postgres-prod` |

See [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md).

---

## ETP (Email to Print) — not “invoice automation”

**ETP** is the product name in the VPS registry (`etp`). It is a desktop app + API that monitors Gmail for PDFs and prints them; the API stores **print history** in Postgres (`/vps/projects/api`, routed at `https://app.graspvisual.com/etp/api/`). It has been in nightly backups as project `etp` since VPS onboarding.

**Do not confuse with ETP:** The legacy Flask stack at `/opt/automation-platform/` (`invoice-automation-*` containers) was **decommissioned 2026-06-06**. It was not Email to Print. Historical backups remain under `invoice-automation_db_*.gpg` and `deployment_*_*.tar.gz.gpg` until pruned via `prune-deprecated-backups.sh --apply`.

---

## Deprecated backup artifacts

Old volume snapshots (e.g. `svc-postgres-prod_*.tar.gz.gpg`) are listed in `BACKUP_DEPRECATED_GLOBS`. Review with `audit-backup.sh`, then remove locally with:

```bash
/vps/scripts/prune-deprecated-backups.sh          # dry-run
/vps/scripts/prune-deprecated-backups.sh --apply   # delete
```

---

## Related

- [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md)
- `docs/maintenance/SCRIPT_USAGE_GUIDE.md` — `backup.sh`, `audit-backup.sh`, `prune-deprecated-backups.sh`, `setup-backup-cron.sh`
