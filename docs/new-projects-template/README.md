# VPS Integration Template Package

**Purpose:** Copyable package for preparing new or existing projects for this VPS
**Last Updated:** 2026-10-31
**Version:** 1.9.0 — onboarding gaps: custom domain/TLS, non-standard compose, compliance, backups, project numbers, env validation (synced from `docs/integration/`).

---

## 📦 What's Included

This folder contains everything you need to integrate a project with the VPS:

- ✅ Complete integration documentation
- ✅ Technical standards and requirements
- ✅ Step-by-step integration guides
- ✅ Real-world examples
- ✅ Quick reference cards
- ✅ Troubleshooting guides
- ✅ SSL certificate setup
- ✅ Best practices and standards

---

## 🚀 Quick Start

### For New Projects

1. **Decide if VPS is right for you:**
   - Read: `integration/SHOULD_I_USE_VPS.md` - Decision guide
   - Check: `integration/AVAILABLE_SERVICES.md` - What's available

2. **Start with the system overview (required):**
   - `integration/VPS_SYSTEM_OVERVIEW.md` — shared vs isolated, full read order
   - `integration/VPS_PROJECTS_REGISTRY.md` — live projects on the VPS
   - For Portal + SVC integration, read `integration/LICENSING_AND_STORE_INTEGRATION.md`
   - If you are working in the VPS repo, also cross-check:
     - `/vps/docs/integration/ADDING_NEW_PROJECTS.md`
     - `/vps/docs/QUICK_REFERENCE_ADDING_PROJECTS.md`
     - `/vps/docs/integration/LICENSING_AND_STORE_INTEGRATION.md`

3. **Copy this folder into your project repo if you want a project-local reference package:**
   ```bash
   # From your new project root
   cp -r /path/to/vps/docs/new-projects-template ./docs/vps-integration
   ```

   Or on Windows PowerShell:
   ```powershell
   Copy-Item -Path "D:\path\to\vps\docs\new-projects-template" -Destination ".\docs\vps-integration" -Recurse
   ```

4. **Read the main guide inside the copied package:**
   - Start with: `integration/AGENT_INTEGRATION_PACKAGE.md`
   - Follow: `integration/QUICK_INTEGRATION_CHECKLIST.md`

5. **Review standards:**
   - Check: `integration/PROJECT_STANDARDS.md`
   - Review: `integration/PROJECT_STRUCTURE_REQUIREMENTS.md`
   - Reference: `integration/INTEGRATION_QUICK_REFERENCE.md`

6. **Match the current generated VPS layout:**
   - Default generated compose files use `build.context: ../../../../projects/<project-name>`
   - The expected default code location on the VPS is `/vps/projects/<project-name>`
   - If your repository lives elsewhere, update `build.context` before deploying

7. **Review examples (optional):**
   - See: `integration/ETP_INTEGRATION_EXAMPLE.md` for a complete real-world example
   - Note: Other ETP files are marked as examples - use as reference only

### For Existing Projects

1. **Start with this package's `integration/` guides**
2. **If you are working in the VPS repo, also check** `/vps/docs/integration/`
3. **Review current code** against `integration/PROJECT_STANDARDS.md`
4. **Create a migration plan** using `integration/PROJECT_INTEGRATION_GUIDE.md`
5. **Update incrementally** following the guide

---

## 📚 Documentation Structure

```
new-projects-template/
├── README.md (this file)
├── COPY_TO_PROJECT.md       # Copy instructions
├── UPDATING_THIS_PACKAGE.md  # How to keep this updated
├── integration/              # Core integration documentation
│   ├── Decision & Planning
│   │   ├── SHOULD_I_USE_VPS.md           ⭐ Decision guide
│   │   ├── AVAILABLE_SERVICES.md          Services overview
│   │   └── PROJECT_STRUCTURE_REQUIREMENTS.md  File structure
│   │
│   ├── Core Integration
│   │   ├── AGENT_INTEGRATION_PACKAGE.md  ⭐ START HERE
│   │   ├── PROJECT_INTEGRATION_GUIDE.md
│   │   ├── PROJECT_STANDARDS.md
│   │   ├── INTEGRATION_QUICK_REFERENCE.md
│   │   └── QUICK_INTEGRATION_CHECKLIST.md
│   │
│   ├── Specialized Guides
│   │   ├── HANDLING_NEW_SERVICES.md
│   │   ├── ADDING_NEW_PROJECTS.md
│   │   ├── ENVIRONMENT_MANAGEMENT.md
│   │   ├── DEPLOYMENT_SYSTEM.md
│   │   ├── USING_PROJECT_TEMPLATE.md
│   │   ├── USING_IN_NEW_PROJECTS.md
│   │   ├── INTEGRATION_SUMMARY.md
│   │   └── README.md
│   │
│   ├── ETP_INTEGRATION_EXAMPLE.md        ⭐ Complete example
│   ├── ETP_CHECKLIST.md                  ⚠️ EXAMPLE
│   ├── ETP_INTEGRATION_SUMMARY.md        ⚠️ EXAMPLE
│   └── ETP_VPS_COMPLIANCE.md             ⚠️ EXAMPLE
├── setup/                    ⚠️ VPS Admin Reference Only
│   ├── REVERSE_PROXY.md              Caddy routing, Grafana edge auth
│   ├── MONITORING.md                 Grafana/Loki/Promtail, LogQL
│   ├── HARDENED_IMAGES.md            Postgres/Redis/Grafana patched bases
│   ├── ENV_FILES_SETUP.md            Project + infrastructure .env files
│   ├── SSL_CERTIFICATE_SETUP.md
│   ├── MULTI_ENV_ARCHITECTURE.md
│   └── VPS_STACK_STRUCTURE.md
└── troubleshooting/          # Troubleshooting guides
    ├── TROUBLESHOOTING.md
    ├── ISSUE_PREVENTION_CHECKLIST.md
    └── STANDARD_PRACTICES.md
```

### About Example Files

⚠️ **ETP Example Files:** The integration folder includes example files from the ETP (Email to Print) project. These are **real-world references** showing how a project was successfully integrated. Use them as:
- ✅ **Reference** for understanding integration patterns
- ✅ **Guide** for creating your own checklists and summaries
- ❌ **NOT** as direct templates to copy-paste

The example files are clearly marked with "⚠️ EXAMPLE FILE" headers.

---

## 🔄 Keeping This Package Updated

**Important:** This package should be updated whenever the VPS changes.

### How to Update

1. **Check for updates:**
   - Review the canonical docs under `/vps/docs/integration/`, `/vps/docs/setup/`, and `/vps/docs/troubleshooting/`
   - Run `/vps/scripts/sync-template-package.sh` if you want to refresh the shared mirrored docs while preserving package-local reference rewrites
   - Check "Last Updated" dates in each document

2. **Update this package:**
   - Copy updated files from VPS repo
   - Or re-copy the entire `docs/new-projects-template/` folder

3. **Version tracking:**
   - Check the version number in this README
   - Compare with VPS repo version

See `UPDATING_THIS_PACKAGE.md` for detailed instructions.

---

## 📋 Integration Checklist

Use this checklist when integrating a project:

- [ ] Read `integration/VPS_SYSTEM_OVERVIEW.md` (shared vs isolated architecture)
- [ ] Read `integration/VPS_PROJECTS_REGISTRY.md` (what exists on the VPS today)
- [ ] Reviewed `integration/SHOULD_I_USE_VPS.md` — VPS is the right fit
- [ ] Checked `integration/AVAILABLE_SERVICES.md` — required services available
- [ ] Copied this template package to project (`docs/vps-integration`)
- [ ] Read `integration/AGENT_INTEGRATION_PACKAGE.md` and `integration/SECURITY_FOR_NEW_APPS.md`
- [ ] Followed `integration/QUICK_INTEGRATION_CHECKLIST.md`
- [ ] Reviewed `integration/PROJECT_STANDARDS.md` and `PROJECT_STRUCTURE_REQUIREMENTS.md`
- [ ] Licensed product? Completed `integration/LICENSING_AND_STORE_INTEGRATION.md` (SVC + Portal + env vars)
- [ ] Prepared Dockerfile, `.env.example`, README, health endpoint (`127.0.0.1` on Node Alpine)
- [ ] Confirmed VPS code path (`/vps/projects/<project-name>`) or updated `build.context`
- [ ] After VPS deploy: `verify-compose-secrets.sh`, `verify-runtime-secrets.sh production`, `check-public-surface.sh`, `health-check.sh`
- [ ] Applied `integration/PRODUCTION_HARDENING_PASS.md` before customer launch
- [ ] Updated Portal compliance pages if payments or new data collection (licensed products)
- [ ] VPS admin updated `VPS_PROJECTS_REGISTRY.md` and ran `verify-projects-registry.sh`

---

## 🆘 Need Help?

1. **Overview:** `integration/VPS_SYSTEM_OVERVIEW.md`
2. **Registry:** `integration/VPS_PROJECTS_REGISTRY.md`
3. **Decision:** `integration/SHOULD_I_USE_VPS.md`
4. **Start with:** `integration/AGENT_INTEGRATION_PACKAGE.md`
5. **Follow checklist:** `integration/QUICK_INTEGRATION_CHECKLIST.md`
6. **Runbook:** `integration/NEW_PROJECT_ONBOARDING_RUNBOOK.md`
7. **Troubleshoot:** `troubleshooting/TROUBLESHOOTING.md`

---

## 📝 Version History

- **1.8.0** (2026-05-27) - System overview spine, projects registry, security doc in package, onboarding runbook, registry verify script
- **1.7.1** (2026-05-27) - Node.js Alpine Dockerfile/health-check guidance (`USER node`, `127.0.0.1`, node-based probes) from live onboarding dry run
- **1.7.0** (2026-05-27) - Added licensing env scaffolding, SVC registration procedure, production hardening pass, and security verification in onboarding flow
- **1.6.0** (2026-05-27) - Documented full Portal + SVC onboarding for licensed products, including store landing pages and main product URLs
- **1.5.0** (2026-05-26) - Made the copied package usable end to end with mirrored shared docs, local entrypoints, and sync-safe local reference rewrites
- **1.4.0** (2026-05-26) - Updated new-project onboarding to match canonical VPS flow and per-project build context defaults
- **1.3.0** (2025-12-22) - Added SSL certificate setup, troubleshooting guides, standard practices
- **1.2.0** (2025-01-14) - Added new services handling, documentation maintenance
- **1.1.0** (2025-01-14) - Initial template package

---

## 🔗 Related Documentation

- **VPS Repository:** Check the main VPS repo for latest updates
- **Maintenance:** See `../maintenance/DOCUMENTATION_MAINTENANCE.md` in VPS repo
- **Shared sync helper:** Run `/vps/scripts/sync-template-package.sh` to refresh shared canonical docs in this package

---

**Note:** This package is maintained as part of the VPS repository. Always check for updates before starting a new integration.


