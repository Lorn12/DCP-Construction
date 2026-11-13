# Agent Integration Package

Use this order when guiding a project into the VPS from a copied package.

0. **System context (required):**
   - `VPS_SYSTEM_OVERVIEW.md` — shared vs isolated, licensed vs internal paths
   - `VPS_PROJECTS_REGISTRY.md` — what is on the VPS today (update after each new deploy)

1. Decide fit:
   - `SHOULD_I_USE_VPS.md`
   - `AVAILABLE_SERVICES.md`
2. Review the onboarding path:
   - `ADDING_NEW_PROJECTS.md`
   - `PROJECT_ADDITION_WORKFLOW.md`
   - `../QUICK_REFERENCE_ADDING_PROJECTS.md` (VPS repo) or `NEW_PROJECT_ONBOARDING_RUNBOOK.md`
3. Validate the project itself:
   - `PROJECT_STANDARDS.md`
   - `SECURITY_FOR_NEW_APPS.md`
   - `PROJECT_STRUCTURE_REQUIREMENTS.md`
4. Review platform integration (licensed products):
   - `LICENSING_AND_STORE_INTEGRATION.md`
   - register in SVC, add Portal config, fill `LICENSE_SERVER_*` env vars
5. Deploy and verify on the VPS with:
   - `/vps/scripts/deploy.sh <environment> <project-name>`
   - `/vps/scripts/health-check.sh <environment|all> <project-name>`
   - `/vps/scripts/verify-compose-secrets.sh`
   - `/vps/scripts/check-public-surface.sh`
   - `/vps/scripts/verify-all-projects.sh --detailed --check-containers`
6. Apply `PRODUCTION_HARDENING_PASS.md` before customer launch (patched DB/cache: `../setup/HARDENED_IMAGES.md` in VPS repo)
7. Update `VPS_PROJECTS_REGISTRY.md` on the VPS repo and run `/vps/scripts/verify-projects-registry.sh`

If you are working inside the VPS repo, cross-check `/vps/docs/integration/`. This copied package is intended to work on its own for app-repo preparation.
