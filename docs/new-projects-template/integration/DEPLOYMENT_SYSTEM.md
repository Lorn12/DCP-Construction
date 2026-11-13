# Deployment System

Use these together:

- `ADDING_NEW_PROJECTS.md` for the onboarding sequence
- `PROJECT_ADDITION_WORKFLOW.md` for the workflow view
- `../QUICK_REFERENCE_ADDING_PROJECTS.md` for the short command list

Core VPS scripts:

- `/vps/scripts/generate-new-project.sh`
- `/vps/scripts/deploy.sh`
- `/vps/scripts/health-check.sh`
- `/vps/scripts/verify-all-projects.sh`

Expected flow:

1. Generate project files.
2. Fill env files (including licensing vars for commercial products).
3. Register in SVC + add Portal config (licensed products).
4. Place app code at `/vps/projects/<project-name>` or adjust `build.context`.
5. Apply Caddy routing.
6. Deploy.
7. Verify health, secrets scan, and public surface.
8. Apply production hardening before launch.
