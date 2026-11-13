# Updating This Template Package

**Purpose:** Instructions for keeping this template package up-to-date with VPS changes  
**Last Updated:** 2026-06-08

---

## Why Update?

This template package should be updated whenever:
- VPS infrastructure changes
- New services are added
- Integration patterns change
- Documentation is improved
- Standards are updated

---

## How to Update

### Method 1: Re-copy Entire Package (Recommended)

**When to use:** Major updates, new files added, or when unsure what changed

```bash
# From your project root
rm -rf docs/vps-integration
cp -r /path/to/vps/docs/new-projects-template ./docs/vps-integration
```

Or on Windows PowerShell:
```powershell
Remove-Item -Path ".\docs\vps-integration" -Recurse -Force
Copy-Item -Path "D:\path\to\vps\docs\new-projects-template" -Destination ".\docs\vps-integration" -Recurse
```

### Method 2: Selective Update

**When to use:** You know exactly what changed and want to update specific files

1. **Check what changed:**
   - Review the canonical docs under `/vps/docs/integration/`, `/vps/docs/setup/`, and `/vps/docs/troubleshooting/`
   - Or run `/vps/scripts/sync-template-package.sh` to refresh the shared mirrored portions of this package
   - Check "Last Updated" dates in each document

2. **Copy updated files:**
   ```bash
   # Example: Update just the integration guide
   cp /path/to/vps/docs/new-projects-template/integration/PROJECT_INTEGRATION_GUIDE.md \
      ./docs/vps-integration/integration/
   ```

   The sync helper preserves package-local reference rewrites for copied docs that need to work outside the VPS repo.

3. **Update version number:**
   - Update version in `README.md`
   - Update "Last Updated" dates if needed

---

## Checking for Updates

### Step 1: Check VPS Repository

```bash
cd /path/to/vps
git pull origin main
```

### Step 2: Review Canonical Docs

```bash
ls docs/integration docs/setup docs/troubleshooting
```

Look for:
- New documentation files
- Updated documentation
- "Last Updated" dates

### Step 3: Compare Versions

Check the version in:
- VPS repo: `docs/new-projects-template/README.md`
- Your project: `docs/vps-integration/README.md`

If VPS version is newer, update your package.

---

## Update Checklist

When updating this package:

- [ ] Checked VPS repository for latest changes
- [ ] Reviewed canonical docs or ran `/vps/scripts/sync-template-package.sh`
- [ ] If projects or Portal apps changed on VPS: updated `docs/integration/VPS_PROJECTS_REGISTRY.md` and ran `/vps/scripts/verify-projects-registry.sh`
- [ ] Compared version numbers
- [ ] Copied updated files
- [ ] Updated version in `README.md`
- [ ] Tested that all links work
- [ ] Verified file structure matches VPS repo

---

## Automated Update Script

You can create a simple script to automate updates:

**`update-vps-docs.sh`** (Linux/Mac):
```bash
#!/bin/bash
VPS_REPO="/path/to/vps"
PROJECT_ROOT="$(pwd)"

echo "Updating VPS integration documentation..."
rm -rf "${PROJECT_ROOT}/docs/vps-integration"
cp -r "${VPS_REPO}/docs/new-projects-template" "${PROJECT_ROOT}/docs/vps-integration"
echo "✓ Documentation updated"
```

**`update-vps-docs.ps1`** (Windows PowerShell):
```powershell
$VPS_REPO = "D:\path\to\vps"
$PROJECT_ROOT = Get-Location

Write-Host "Updating VPS integration documentation..."
Remove-Item -Path "$PROJECT_ROOT\docs\vps-integration" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$VPS_REPO\docs\new-projects-template" -Destination "$PROJECT_ROOT\docs\vps-integration" -Recurse
Write-Host "✓ Documentation updated"
```

---

## When to Update

### Update Immediately If:
- Starting a new project
- VPS infrastructure changed significantly
- New services were added
- Integration patterns changed

### Update Periodically:
- Monthly check for updates
- Before major project milestones
- When encountering integration issues

### Don't Update If:
- Only minor typo fixes
- Changes don't affect your project
- You're in the middle of active integration

---

## Version Tracking

Use these signals when checking package freshness:
- `docs/new-projects-template/README.md` - Package version and last-updated date
- Canonical docs under `docs/integration/`, `docs/setup/`, and `docs/troubleshooting/`
- `/vps/scripts/sync-template-package.sh` output for shared-file refreshes and package-local reference rewrites

Always check these before updating.

---

## Questions?

If you're unsure whether to update:
1. Check the changelog
2. Compare "Last Updated" dates
3. Review what changed
4. Update if changes are relevant to your project

---

**Remember:** This package is a snapshot. Always verify against the VPS repository for the absolute latest information.



