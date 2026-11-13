# Project Integration Guide

Use this guide when adapting an existing project for the VPS.

## Preparation

1. Review `PROJECT_STANDARDS.md`.
2. Review `PROJECT_STRUCTURE_REQUIREMENTS.md`.
3. Confirm the app has:
   - a Dockerfile
   - a health endpoint
   - a documented `.env.example`

## VPS Onboarding

1. Follow `ADDING_NEW_PROJECTS.md` to generate VPS project files.
2. Use `PROJECT_ADDITION_WORKFLOW.md` for the end-to-end sequence.
3. Use `../QUICK_REFERENCE_ADDING_PROJECTS.md` for the shortest command list.

## Integration-Specific Checks

- Make sure the generated compose files point at the real code location.
- Default expected location is `/vps/projects/<project-name>`.
- If the repository lives elsewhere on the VPS, update `build.context` before deployment.
- Review `LICENSING_AND_STORE_INTEGRATION.md` if the project needs licensing, portal, or store behavior.
