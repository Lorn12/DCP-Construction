# Portal Compliance Updates for New Products

**Audience:** VPS admin or product owner after deploying a licensed/customer-facing product  
**Last Updated:** 2026-05-27  
**Verified against:** `projects/portal/src/app/compliance/`

When a new product collects payments, cookies, or new categories of user data, update Portal compliance pages **before** public launch. Portal is deployed from `environments/production/projects/portal/`.

---

## When to update

Update if the product:

- Accepts payments or subscriptions (including via Stripe through SVC)
- Sets new cookies or local storage used for tracking or auth
- Processes new types of personal data not already described on Portal
- Changes security posture (new auth method, new subprocessors, new regions)

Internal-only tools with no storefront and no new data practices may skip this if legal review agrees.

---

## Pages and paths

All paths are under `portal/src/app/compliance/`:

| Page | File | Review for |
|------|------|------------|
| Privacy Policy | `privacy/page.tsx` | Product-specific data collected, cross-app sharing, payment processor |
| Terms of Service | `terms/page.tsx` | Service description, licensing, payment terms |
| Cookie Policy | `cookies/page.tsx` | New cookies or trackers introduced by the app |
| Security | `security/page.tsx` | Auth methods, infrastructure or subprocessors |
| Refund Policy | `refund-policy/page.tsx` | Plan-specific refund eligibility |
| Data Retention | `data-retention/page.tsx` | New data categories and retention periods |

After edits:

1. Bump version/date on modified pages (follow existing page conventions).
2. Redeploy Portal: `/vps/scripts/deploy.sh production portal`
3. Spot-check live URLs on `https://store.graspvisual.com` compliance routes.

---

## Related

- [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md) § E (verify loop mentions compliance)  
- [NEW_PROJECT_ONBOARDING_RUNBOOK.md](NEW_PROJECT_ONBOARDING_RUNBOOK.md)
