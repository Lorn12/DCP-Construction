# Integration Quick Reference

Most-used local references in this package:

- `VPS_SYSTEM_OVERVIEW.md` - entire system (read first)
- `VPS_PROJECTS_REGISTRY.md` - live projects on VPS
- `ADDING_NEW_PROJECTS.md` - full onboarding flow
- `LICENSING_AND_STORE_INTEGRATION.md` - Portal + SVC + main URL model
- `PRODUCTION_HARDENING_PASS.md` - baseline to hardened production
- `../setup/HARDENED_IMAGES.md` (VPS repo) - patched Postgres/Redis/Grafana bases
- `../QUICK_REFERENCE_ADDING_PROJECTS.md` - shortest command reference
- `PROJECT_STANDARDS.md` - technical requirements for the app
- `PROJECT_ADDITION_WORKFLOW.md` - workflow diagram
- `LICENSING_AND_STORE_INTEGRATION.md` - portal/store/license contract

Most-used VPS commands once you are on the server:

- `/vps/scripts/generate-new-project.sh <project-name> <project-number> --env production`
- `/vps/scripts/deploy.sh <environment> <project-name>`
- `/vps/scripts/health-check.sh <environment|all> <project-name>`
- `/vps/scripts/verify-all-projects.sh --detailed --check-containers`
