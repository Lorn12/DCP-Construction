# Integration Summary

This package is meant to give a project-local integration reference for the VPS.

Primary local docs:

- `VPS_SYSTEM_OVERVIEW.md`
- `VPS_PROJECTS_REGISTRY.md`
- `AGENT_INTEGRATION_PACKAGE.md`
- `QUICK_INTEGRATION_CHECKLIST.md`
- `ADDING_NEW_PROJECTS.md`
- `../QUICK_REFERENCE_ADDING_PROJECTS.md`
- `PROJECT_STANDARDS.md`
- `LICENSING_AND_STORE_INTEGRATION.md`

Operational expectation:

- Every licensed product uses shared Portal + SVC platform services
- Standard licensing env: `LICENSE_SERVER_URL`, `LICENSE_SERVER_APP_ID`, `LICENSE_SERVER_APP_API_KEY`
- Apply `PRODUCTION_HARDENING_PASS.md` before customer launch
- Production Postgres/Redis use digest-pinned `vps-*:patched` images — see VPS repo `docs/setup/HARDENED_IMAGES.md`
- Portal provides store/landing/pricing pages at `store.graspvisual.com/{appId}`
- SVC validates trials/subscriptions/licenses for the product backend
- The VPS generator creates project files under `/vps/environments/<env>/projects/<project-name>/`
- Generated compose files default to `build.context: ../../../../projects/<project-name>`
- The expected default code location is `/vps/projects/<project-name>`
- Deployment and verification happen with the VPS scripts, not from this copied project repo alone
