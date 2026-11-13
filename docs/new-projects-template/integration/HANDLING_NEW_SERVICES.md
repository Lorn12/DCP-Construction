# Handling New Services

If a project needs infrastructure beyond the default app/database/cache path:

1. Review `AVAILABLE_SERVICES.md` to see what the VPS already supports.
2. Review `PROJECT_STANDARDS.md` and `PROJECT_STRUCTURE_REQUIREMENTS.md` to understand current deployment expectations.
3. If the needed service is not covered, treat it as a VPS-repo change rather than a project-only change.

Use the VPS repo for actual infrastructure additions, then refresh this package from the canonical source.
