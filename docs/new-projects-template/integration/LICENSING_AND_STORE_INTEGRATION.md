# Licensing, Portal, and Store Integration

**Last Updated:** 2026-06-07

## Purpose

Explain how every new Grasp Visual product on this VPS connects to the shared **Portal** (store/marketing) and **SVC** (license server), including user licensing, store pages, and the product's main URL.

This is not optional for commercial products. If a new project sells subscriptions, runs trials, or needs a public product page, it must be wired into Portal + SVC as part of onboarding.

## The Three-Part Model

| Component | Project | Role for new products |
|-----------|---------|------------------------|
| **Portal** | `portal` | Public storefront and per-app marketing pages at `store.graspvisual.com` |
| **SVC** | `svc` | License authority, trial/subscription state, Stripe webhooks |
| **Your product** | new project | Live app/API that validates entitlements against SVC |

```text
User
  │
  ├─► store.graspvisual.com/{appId}          Portal landing/pricing/download
  │         │
  │         └─► SVC (PORTAL_API_KEY)         checkout, trials, subscriptions
  │
  └─► main app URL                           your deployed product
            │
            └─► SVC (app key + X-App-ID)     license validation
```

## What Every New Licensed Product Gets

Each new product should plan for **three public surfaces**:

1. **Store presence** on the shared Portal
2. **License enforcement** through SVC
3. **Main product URL** where users actually use the app

### 1) Portal store and landing pages

Portal is the shared marketing/store layer. It does **not** replace your app; it sells and explains it.

For each app ID (example: `timekeeper`), Portal provides:

| Surface | URL | Purpose |
|---------|-----|---------|
| Store grid | `https://store.graspvisual.com/` | Lists all public apps |
| App landing page | `https://store.graspvisual.com/{appId}` | Hero, features, FAQ, screenshots |
| Pricing page | `https://store.graspvisual.com/{appId}/pricing` | Plans, trial info, checkout entry |
| Download route | `https://store.graspvisual.com/api/download/{appId}` | Desktop app trial/download flow (**POST** with email; **GET returns 405**) |
| Account hub | `https://store.graspvisual.com/account` | Stripe customer portal access by checkout email |
| Account pages | `https://store.graspvisual.com/account/{appId}` | Per-app subscription lookup by checkout email |

Portal app content lives in:

- `/vps/projects/portal/src/config/apps/{appId}.ts`
- registered in `/vps/projects/portal/src/config/apps/index.ts`

The Portal `appId` must match the SVC `app_id`.

**Portal API security (storefront):**

- Public API routes resolve apps with `getPublicApp()` — apps with `visibility: "hidden"` (for example `gantry`) are not exposed on `/api/download/*`, `/api/checkout/*`, or tier checkout routes.
- IP rate limits (`src/lib/ip-rate-limit.ts`): `POST /api/download/:appId` (10/hr), checkout routes (20/hr), `POST /api/contact/enterprise` (5/hr), `POST /api/account/portal` (10/hr).
- `PORTAL_API_KEY` is validated at production startup (`src/instrumentation.ts`); `/api/health` reports `checks.portalApiKey` and `checks.resend`.

### 2) SVC licensing backend

SVC is the shared license authority. It owns:

- app registration and per-app API keys
- trial creation and subscription state
- checkout URL generation for Portal
- Stripe webhook verification and billing events

Your product backend must **not** talk to Stripe directly for licensing. It talks to SVC.

**Payment provider note:** Grasp Visual is standardizing on Stripe. SVC remains the billing and licensing authority. Products must not call Stripe directly; they should continue to validate licenses and entitlements through SVC. Implementation and cutover state: [STRIPE_MIGRATION_STATUS.md](STRIPE_MIGRATION_STATUS.md).

Standard env vars for **new projects** (included in generated `env.*.example` files):

- `LICENSE_SERVER_URL` — internal: `http://svc-api-prod:4001`; public API base: `https://app.graspvisual.com/svc/api`
- `LICENSE_SERVER_APP_ID` — must match SVC `app_id` and Portal `appId`
- `LICENSE_SERVER_APP_API_KEY` — issued once at SVC registration (never reuse `PORTAL_API_KEY`)

Older products may use project-specific names (example: `GROWPLAN_APP_ID`, `GV_APP_ID`). New projects should use the standard names above.

Typical request headers from your backend to SVC:

- `X-App-ID: <LICENSE_SERVER_APP_ID value>`
- `X-API-Key: <LICENSE_SERVER_APP_API_KEY>` — **required** on `GET /api/license/:email` (returns 401 without a valid app key)

**Desktop OAuth (Gmail via SVC):** External desktop clients (e.g. ETP) must use the PKCE desktop flow documented in `/vps/projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md`:

1. `GET /api/auth/oauth-url?state=<state>&app_id=<app-id>` — response includes `authUrl` and `codeVerifier` (store `codeVerifier` in memory).
2. After the user completes Google OAuth, `GET /api/auth/oauth-tokens?state=<state>&code_verifier=<codeVerifier>` with header `X-App-ID: <app-id>`.
3. Tokens are one-time use; the server deletes the pending row after successful retrieval.

**Lost app API key:** Regenerate in SVC admin (App Details → API → Regenerate API Key) or `POST /api/admin/apps/:appId/regenerate-api-key` with master admin key. Update the product `env.production` as `LICENSE_SERVER_APP_API_KEY` and redeploy — keys are shown only once at registration/regeneration.

### 3) Main product URL

This is the URL users bookmark and use daily. It is **separate** from the Portal landing page.

Two supported patterns:

#### A. Path-based default (generator default)

Best for early onboarding and internal/testing flows.

- API: `https://app.graspvisual.com/<project>/api/*`
- App/UI: `https://app.graspvisual.com/<project>/*`

Generated by:

- `/vps/scripts/generate-new-project.sh`
- `caddy.<env>.snippet.txt` merged into `Caddyfile`

#### B. Branded custom domain (recommended for customer-facing products)

Best when the product needs its own main URL.

Examples already on this VPS:

- `https://growplan.app`
- `https://time.graspvisual.com`

Requires:

- custom Caddy site block in `/vps/infrastructure/reverse-proxy/Caddyfile`
- TLS cert for the domain
- Portal app config `appUrl` pointing to the live domain

Portal landing remains on `store.graspvisual.com/{appId}`; the `appUrl` links users from store/pricing to the live product.

## End-to-End User Journey

1. User discovers the product on `store.graspvisual.com` or `store.graspvisual.com/{appId}`.
2. User starts a trial, downloads, or purchases through Portal.
3. Portal calls SVC server-to-server using `PORTAL_API_KEY`.
4. SVC records trial/subscription/license state.
5. User opens the product at its main URL (path-based or custom domain).
6. Product backend validates entitlement with SVC using its own app key and `X-App-ID`.
7. Product grants or denies access based on SVC response.

## Responsibilities by Team

### VPS admin

- deploy/verify `portal` and `svc`
- register the app in SVC
- add Portal app config and redeploy Portal
- configure Caddy routing for the product main URL
- update Portal compliance pages when the product collects new data or payments

### Product/backend team

- implement SVC license checks in the app backend
- expose health endpoint and env examples
- provide pricing/trial requirements for Portal + SVC setup
- decide whether the main URL is path-based or custom-domain

## Register the App in SVC (Procedure)

Choose one method. The `app_id` must match the Portal `appId` and `LICENSE_SERVER_APP_ID` in the product env.

### Option A: SVC Admin UI (recommended)

1. Open `https://app.graspvisual.com/svc/admin`
2. Log in with master admin credentials (`MASTER_ADMIN_KEY` or `ADMIN_API_KEY` from SVC env).
3. Register a new app with:
   - **Application ID:** same as VPS project name (example: `billing-system`)
   - **Display name:** customer-facing product name
   - **Database name:** optional; SVC can create per-app DB (example: `billing_system_prod`)
4. **Copy the app API key immediately** — it is shown only once at registration.
5. Verify the app appears in the app list and is active.

### Option B: Registration API

Master key source (on the VPS):

```bash
grep -E 'MASTER_ADMIN_KEY|ADMIN_API_KEY' /vps/environments/production/projects/svc/env.production
```

Register:

```bash
MASTER_KEY="your_master_admin_key_here"

curl -X POST https://app.graspvisual.com/svc/api/admin/apps \
  -H "X-API-Key: $MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "billing-system",
    "app_name": "Billing System",
    "database_name": "billing_system_prod",
    "notes": "New VPS product"
  }'
```

Save the `api_key` from the JSON response as `LICENSE_SERVER_APP_API_KEY` in the product env.

### After registration

- [ ] Run SVC DB verification if applicable: `/vps/projects/svc/scripts/verify-app-database.js`
- [ ] Configure trial days and plan/pricing metadata in SVC admin
- [ ] Configure Stripe product/price mapping in SVC if paid plans are needed

Detailed client integration steps: `/vps/projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md`

SVC database notes: `/vps/projects/svc/docs/setup/DATABASE_SETUP.md`

## Onboarding Checklist for a New Licensed Product

### A. Register the app in SVC

- [ ] Choose the canonical `appId` (lowercase, hyphens; example: `billing-system`)
- [ ] Register via SVC admin UI or `/svc/api/admin/apps` (see procedure above)
- [ ] Save the app-specific API key to product `env.production` as `LICENSE_SERVER_APP_API_KEY`
- [ ] Set `LICENSE_SERVER_APP_ID` to the same `app_id`
- [ ] Configure trial days and plan/pricing metadata
- [ ] Configure Stripe product/price mapping in SVC if paid plans are needed

### B. Add the app to Portal

- [ ] Create `portal/src/config/apps/{appId}.ts`
- [ ] Register it in `portal/src/config/apps/index.ts`
- [ ] Set `visibility: "public"` when ready for the storefront
- [ ] Fill landing content: name, tagline, description, features, FAQ, screenshots
- [ ] Fill pricing config for `/pricing`
- [ ] Set one launch target:
  - web app: `appUrl: "https://your-main-domain"`
  - desktop app: `downloadUrl` and optional `downloadRepo`
- [ ] Set Portal integration preferences (`contractPreference`, fallback behavior)
- [ ] Redeploy Portal

### C. Wire the product backend to SVC

- [ ] Set `LICENSE_SERVER_URL` (from generated env example)
- [ ] Set `LICENSE_SERVER_APP_ID` (same as SVC/Portal app ID)
- [ ] Set `LICENSE_SERVER_APP_API_KEY` from registration response
- [ ] Implement license validation using `X-App-ID` + app key
- [ ] Decide fail-open vs fail-closed behavior for trial/license outages (GrowPlan backend is **fail-closed** on paid API routes via `requireLicense` middleware; login returns license status for UI only; Portal desktop download flow can use per-app `allowTrialFailOpen` in `portal/src/config/apps/{appId}.ts`)
- [ ] Do **not** put `LICENSE_SERVER_APP_API_KEY: ${LICENSE_SERVER_APP_API_KEY:-}` in compose `environment:` — empty host-shell substitution overrides `env_file` (see [../troubleshooting/TROUBLESHOOTING.md](../troubleshooting/TROUBLESHOOTING.md) §3.2)
- [ ] Mount `requireLicense` (or equivalent) on every paid feature route — not only implement the SVC client

#### Reference: GrowPlan (`growplan`, 2026-06-07)

Production reference for web apps with custom domains:

| Item | GrowPlan implementation |
|------|-------------------------|
| SVC client | `backend/src/services/licenseService.ts` — fail-closed |
| Route gate | `backend/src/middleware/requireLicense.ts` on programs, products, recommendations, external |
| Login | JWT + license status for UI; no license block at login |
| Frontend | `RequireActiveLicense` on `/programs/*`; banner in `Layout` |
| Region writes | `authenticateToken` on `PATCH/POST` mutation routes |
| Compose | `LICENSE_SERVER_*`, `POSTGRES_PASSWORD`, `REDIS_URL` in `env.production` only — see TROUBLESHOOTING §3.2–3.3 |
| Docs | [projects/growplan/docs/security/SECURITY.md](../../projects/growplan/docs/security/SECURITY.md) |

### D. Configure the main product URL

- [ ] Choose path-based or custom-domain routing
- [ ] Apply generated Caddy snippet or custom domain block
- [ ] Validate and restart reverse proxy
- [ ] Set Portal `appUrl` to the final live URL if using a custom domain

### E. Verify the full loop

- [ ] Portal landing page loads: `store.graspvisual.com/{appId}`
- [ ] Pricing page loads: `store.graspvisual.com/{appId}/pricing`
- [ ] Desktop download (if applicable): `POST /api/download/{appId}` succeeds; `GET` returns **405**
- [ ] Hidden apps are not reachable on public Portal API routes until `visibility: "public"`
- [ ] Product health endpoint returns 200 through routed URL
- [ ] Product backend can validate a trial/license via SVC
- [ ] Portal can reach SVC with `PORTAL_API_KEY`
- [ ] Compliance pages updated if product handles payments, cookies, or new data categories — see [PORTAL_COMPLIANCE_UPDATES.md](PORTAL_COMPLIANCE_UPDATES.md)

## Key Rules

1. `PORTAL_API_KEY` is only for Portal ↔ SVC server-to-server traffic.
2. New project backends do **not** reuse `PORTAL_API_KEY`.
3. New project backends use:
   - `LICENSE_SERVER_URL`
   - `LICENSE_SERVER_APP_ID`
   - `LICENSE_SERVER_APP_API_KEY` (issued at SVC registration)
4. Stripe webhook verification stays in SVC using `STRIPE_WEBHOOK_SECRET`.
5. Portal `appId`, SVC `app_id`, and VPS project name should match unless there is a documented exception.

## Environment Variables by Component

### Portal

- `LICENSE_SERVER_URL`
- `PORTAL_API_KEY` (minimum 32 characters; validated at production startup)
- `PORTAL_CONTRACT_DEFAULT_VERSION`
- `RESEND_API_KEY` (required for `POST /api/contact/enterprise`)
- `EMAIL_FROM_ADDRESS`
- `CHECKOUT_ENABLED` / `NEXT_PUBLIC_CHECKOUT_ENABLED` (checkout gating)

### SVC

- `PORTAL_API_KEY`
- `STRIPE_SECRET_KEY` (restricted key `rk_...` recommended over `sk_...`)
- `STRIPE_WEBHOOK_SECRET` (`whsec_...` for `POST /api/webhooks/stripe`)
- `PORTAL_BASE_URL` (checkout success/cancel + billing portal return URLs; defaults to `https://store.graspvisual.com`)
- Legacy (during Lemon Squeezy migration only): `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_SLUG`, `LEMONSQUEEZY_WEBHOOK_SECRET`

### New Project Backend

- `LICENSE_SERVER_URL`
- `LICENSE_SERVER_APP_ID`
- `LICENSE_SERVER_APP_API_KEY`

## Expected Headers

### Project backend → SVC

- `X-App-ID: <project-app-id>`
- app auth key required by the endpoint

### Portal → SVC

- `X-API-Key: <PORTAL_API_KEY>` — required for checkout, trials, portal URLs, and subscription reads (`/api/portal/*`, `/api/subscriptions/*`). Session cookies from SVC admin UI do **not** authorize these routes.

### Desktop client → SVC (OAuth token retrieval)

- `X-App-ID: <app-id>`
- Query: `state`, `code_verifier` (PKCE proof-of-possession from `/api/auth/oauth-url` response)

## URL Map Example

For a hypothetical new web app `billing-system` with custom domain `billing.example.com`:

| Surface | URL | Owner |
|---------|-----|-------|
| Store grid | `https://store.graspvisual.com/` | Portal |
| Landing page | `https://store.graspvisual.com/billing-system` | Portal |
| Pricing page | `https://store.graspvisual.com/billing-system/pricing` | Portal |
| Live product | `https://billing.example.com` | Your project |
| License API | `https://app.graspvisual.com/svc/api/*` | SVC |

If the product uses the default path model instead:

| Surface | URL |
|---------|-----|
| Live product API | `https://app.graspvisual.com/billing-system/api/*` |
| Live product UI | `https://app.graspvisual.com/billing-system/*` |

## Existing Platform Projects (Reference)

| Project | Type | How new products use it |
|---------|------|-------------------------|
| `svc` | Platform | Register app, issue keys, validate licenses |
| `portal` | Platform | Add landing/pricing/store pages |
| `etp` | Product example | Desktop app with Portal download flow |
| `growplan` | Product example | Web app with custom domain + Portal `appUrl` |
| `timekeeper` | Product example | Web app with custom domain + tiered Portal pricing |

## Related Docs

- [ADDING_NEW_PROJECTS.md](ADDING_NEW_PROJECTS.md)
- [PROJECT_ADDITION_WORKFLOW.md](PROJECT_ADDITION_WORKFLOW.md)
- [QUICK_REFERENCE_ADDING_PROJECTS.md](../QUICK_REFERENCE_ADDING_PROJECTS.md)
- Portal project README: `/vps/projects/portal/README.md`
- SVC registration + client integration: `/vps/projects/svc/docs/client-app-update/CLIENT_APP_UPDATE_GUIDE.md`
- SVC contract notes: `/vps/projects/svc/docs/integration/CONTRACT_VERSIONING.md`
- Production hardening after baseline deploy: [PRODUCTION_HARDENING_PASS.md](PRODUCTION_HARDENING_PASS.md)
