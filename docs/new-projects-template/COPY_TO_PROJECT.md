# Copying This Template to Your Project

**Quick Instructions:** How to copy this template package to a new or existing project

---

## Quick Copy Commands

### Linux/Mac

```bash
# From your project root
cp -r /path/to/vps/docs/new-projects-template ./docs/vps-integration
```

### Windows PowerShell

```powershell
# From your project root
Copy-Item -Path "D:\path\to\vps\docs\new-projects-template" -Destination ".\docs\vps-integration" -Recurse
```

### Windows Command Prompt

```cmd
xcopy /E /I "D:\path\to\vps\docs\new-projects-template" ".\docs\vps-integration"
```

---

## What Gets Copied

```
new-projects-template/
├── README.md                    # Main guide
├── UPDATING_THIS_PACKAGE.md     # How to keep updated
├── COPY_TO_PROJECT.md           # This file
├── integration/                 # Integration docs + example reference files
│   ├── Core guides
│   └── ETP example files (⚠️ reference only)
├── setup/                       # VPS setup docs
└── troubleshooting/             # Troubleshooting guides
```

**Note:** The integration folder includes example files from the ETP project. These are marked with "⚠️ EXAMPLE FILE" headers and should be used as reference, not as direct templates.

---

## After Copying

1. **Read the package README:**
   - `docs/vps-integration/README.md`

2. **Use the package guides first:**
   - Start with `docs/vps-integration/integration/VPS_SYSTEM_OVERVIEW.md`
   - Read `docs/vps-integration/integration/VPS_PROJECTS_REGISTRY.md`
   - Then `docs/vps-integration/integration/AGENT_INTEGRATION_PACKAGE.md`
   - Follow `docs/vps-integration/integration/QUICK_INTEGRATION_CHECKLIST.md`
   - If you are also working in the VPS repo, cross-check `/vps/docs/integration/ADDING_NEW_PROJECTS.md`
   - If you are also working in the VPS repo, cross-check `/vps/docs/QUICK_REFERENCE_ADDING_PROJECTS.md`

3. **Match the current VPS layout:**
   - Generated compose files default to `build.context: ../../../../projects/<project-name>`
   - The default expected code location on the VPS is `/vps/projects/<project-name>`
   - If your repo will live elsewhere on the VPS, update `build.context`

3b. **Prepare your app repo before VPS deploy (local work):**
   - `integration/SECURITY_FOR_NEW_APPS.md` — isolation, secrets, firewall (VPS handles routing)
   - `integration/PROJECT_STANDARDS.md` — Dockerfile, health endpoint, licensing env names
   - `integration/LICENSING_AND_STORE_INTEGRATION.md` — if the product uses Portal + SVC
   - Node.js on Alpine: use `USER node`, health check `127.0.0.1` with `node` fetch (not `wget` + `localhost`)
   - `.env.example` in your repo should list `LICENSE_SERVER_URL`, `LICENSE_SERVER_APP_ID`, `LICENSE_SERVER_APP_API_KEY` for licensed products

4. **Keep it updated:**
   - See: `docs/vps-integration/UPDATING_THIS_PACKAGE.md`

---

## Project Structure After Copy

Your project should look like:

```
your-project/
├── docs/
│   └── vps-integration/         # Copied template
│       ├── README.md
│       ├── integration/
│       ├── setup/
│       └── troubleshooting/
├── src/
├── Dockerfile
└── README.md
```

---

## Tips

- **Rename the folder:** You can rename `vps-integration` to whatever you prefer
- **Add to .gitignore:** Don't ignore this - it should be committed
- **Update regularly:** Check for updates periodically (see UPDATING_THIS_PACKAGE.md)

---

**That's it!** You now have all the VPS integration documentation in your project.


