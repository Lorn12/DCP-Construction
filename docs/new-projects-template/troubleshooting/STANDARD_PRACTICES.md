# Standard Practices for VPS Development

**Last Updated:** 2026-05-26  
**Purpose:** Core principles and processes for maintaining and improving the VPS codebase

---

## Core Principle: Fix Root Causes, Not Just Symptoms

**Critical Philosophy:** For every issue encountered, we must:

1. **Fix the root cause** in the codebase/scripts/templates so it never happens again
2. **Document the issue** so we understand what happened
3. **Add preventive checks** to catch it early if it somehow occurs
4. **Create diagnostic tools** to identify it quickly

This ensures issues don't repeat and the codebase improves over time.

---

## Process for Fixing Issues

When encountering any issue, follow this process:

### Step 1: Identify Root Cause

Don't just treat symptoms. Ask:
- Why did this happen?
- What is the underlying problem?
- What needs to change to prevent it?

**Example:**
- ❌ Symptom: "Reverse proxy can't reach containers"
- ✅ Root Cause: "Reverse-proxy container needed a restart after upstream changes"

### Step 2: Fix the Root Cause

Fix it in the codebase/scripts/templates:

**Example:**
- Update `deploy.sh` to automatically restart the reverse proxy after deployment
- This fixes the root cause, not just the symptom

### Step 3: Update Templates

Ensure templates prevent the issue:

**Example:**
- Update docker-compose templates to include dual-network configuration
- Future projects won't have this issue

### Step 4: Add Verification/Checks

Add checks to catch it early:

**Example:**
- Add DNS resolution test to deploy script
- Add network membership check to verification script

### Step 5: Document

Document the issue and solution:

**Example:**
- Add to troubleshooting guide
- Explain root cause and prevention

---

## When Fixing Issues

### Always Ask:
- "How do we prevent this from happening again?"
- "What needs to change in templates/scripts?"
- "What verification can catch this early?"

### Always Update:
- Scripts that can prevent it
- Templates that can avoid it
- Verification tools that can detect it

### Never:
- Just document without fixing
- Add workarounds without addressing root cause
- Create templates that repeat the problem
- Write scripts that don't prevent known issues

---

## For New Issues

When a new issue arises:

1. **Follow the same process:**
   - Identify root cause
   - Fix in codebase/scripts/templates
   - Update templates immediately
   - Add to verification script
   - Document in troubleshooting guide

2. **Update immediately:**
   - Don't wait to fix templates
   - Don't wait to add verification
   - Fix it now so it doesn't happen again

3. **Share knowledge:**
   - Document in troubleshooting guide
   - Update prevention checklist
   - Add to diagnostic script

---

## This Ensures

✅ **Issues don't repeat** - Root causes are fixed  
✅ **New projects work from the start** - Templates are correct  
✅ **Codebase improves over time** - Each fix makes it better  
✅ **Knowledge is preserved** - Documented but not relied upon  

---

## Examples

### Example 1: DNS Resolution Issue

**Issue:** Reverse proxy can't resolve container hostnames after deployment

**Root Cause:** Reverse-proxy container needed a restart after upstream changes

**Fix:**
1. Update `deploy.sh` to restart the reverse proxy after deployment ✅
2. Update templates to ensure dual-network configuration ✅
3. Add DNS verification to deploy script ✅
4. Document in troubleshooting guide ✅

**Result:** Future deployments work correctly from the start

### Example 2: Environment Variable Naming

**Issue:** Variables not loading, containers fail

**Root Cause:** Wrong variable names (using `_PROD` suffix in production)

**Fix:**
1. Update env.example files with correct naming ✅
2. Update templates with correct examples ✅
3. Add validation to deploy script ✅
4. Document naming conventions ✅

**Result:** New projects use correct naming from the start

### Example 3: Dockerfile User Conflicts

**Issue:** Build fails with "gid '1000' in use"

**Root Cause:** Creating user with GID already in use by base image

**Fix:**
1. Update Dockerfile template to use base image's user ✅
2. Document best practice ✅
3. Add to project standards ✅

**Result:** New projects don't have this issue

---

## Enforcement

This principle is enforced through:

1. **Cursor Rules** - Agents must follow this approach
2. **Verification Scripts** - Check that fixes are in place
3. **Templates** - Prevent issues from the start
4. **Documentation** - Guides follow this principle

---

## Review Process

When reviewing code or fixes:

1. **Does it fix the root cause?** (Not just symptoms)
2. **Are templates updated?** (Prevents recurrence)
3. **Are checks added?** (Catches it early)
4. **Is it documented?** (Knowledge preserved)

If any answer is "no", the fix is incomplete.

---

**Last Updated:** 2026-05-26  
**See Also:**
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Issue solutions
- [ISSUE_PREVENTION_CHECKLIST.md](ISSUE_PREVENTION_CHECKLIST.md) - Prevention checklist
- `../integration/PROJECT_STANDARDS.md` - Technical standards


