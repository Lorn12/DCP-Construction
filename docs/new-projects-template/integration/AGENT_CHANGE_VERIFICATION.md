# Agent Change Verification

Use these checks after changing onboarding docs, templates, or VPS project files:

- `/vps/scripts/verify-codebase.sh`
- `/vps/scripts/verify-new-project-onboarding.sh`
- `/vps/scripts/verify-all-projects.sh --detailed --check-containers`
- `/vps/scripts/verify-compose-secrets.sh`
- `/vps/scripts/verify-runtime-secrets.sh production`
- `/vps/scripts/verify-everything.sh`

For new-project flow changes, also confirm:

- generated compose files point to the intended app path
- generated env example files exist for the target environments
- generated Caddy snippets match the expected project name and upstreams
