# Quick Integration Checklist

- [ ] Read `VPS_SYSTEM_OVERVIEW.md` and `VPS_PROJECTS_REGISTRY.md`
- [ ] Confirm the project fits the VPS with `SHOULD_I_USE_VPS.md`
- [ ] Review required services in `AVAILABLE_SERVICES.md`
- [ ] Review `SECURITY_FOR_NEW_APPS.md` (isolation + app security requirements)
- [ ] Generate the VPS project skeleton with `ADDING_NEW_PROJECTS.md`
- [ ] Place the app code at `/vps/projects/<project-name>` or update `build.context`
- [ ] Create real env files from the generated examples
- [ ] Merge the generated Caddy snippet into the reverse proxy config
- [ ] Deploy with `/vps/scripts/deploy.sh <environment> <project-name>`
- [ ] Verify with `/vps/scripts/health-check.sh <environment|all> <project-name>`
- [ ] Run `/vps/scripts/verify-compose-secrets.sh` and `/vps/scripts/check-public-surface.sh`
- [ ] Run `/vps/scripts/verify-all-projects.sh --detailed --check-containers`
- [ ] Licensed product? Complete `LICENSING_AND_STORE_INTEGRATION.md` (SVC register, Portal config, `LICENSE_SERVER_*` env)
- [ ] Apply `PRODUCTION_HARDENING_PASS.md` before customer launch
- [ ] Production hardened stacks: review `../setup/HARDENED_IMAGES.md` (VPS repo) for patched Postgres/Redis wiring
- [ ] Update `VPS_PROJECTS_REGISTRY.md` on VPS and run `/vps/scripts/verify-projects-registry.sh`

For a condensed runbook, use `NEW_PROJECT_ONBOARDING_RUNBOOK.md`. For commands only, use `../QUICK_REFERENCE_ADDING_PROJECTS.md` in the VPS repo.
