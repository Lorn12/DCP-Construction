# Custom Domain and TLS

**Audience:** VPS admin onboarding a product on its own hostname (not only `app.graspvisual.com/<project>/`)  
**Last Updated:** 2026-10-31  
**Verified against:** `infrastructure/reverse-proxy/Caddyfile`, `scripts/copy-certificates.sh`, `scripts/setup-tasquantum-ssl.sh`, production projects `growplan`, `timekeeper`, `tasquantum`, and `abpd`

Path-based routing is covered in [../QUICK_REFERENCE_ADDING_PROJECTS.md](../QUICK_REFERENCE_ADDING_PROJECTS.md). Use this guide when the product needs a **dedicated hostname** (production examples: `growplan.app`, `time.graspvisual.com`).

---

## Production examples on this VPS

| Domain | Caddy site block | TLS cert path | Product compose |
|--------|------------------|---------------|-----------------|
| `growplan.app` (+ `www` redirect) | `growplan.app:443` in `Caddyfile` | `/vps/infrastructure/reverse-proxy/ssl/growplan.app/` | `environments/production/projects/growplan/` |
| `time.graspvisual.com` | `time.graspvisual.com:443` | `.../ssl/time.graspvisual.com/` | `environments/production/projects/timekeeper/` |
| `tasquantum.com` + `www.tasquantum.com` (apex → www) | `tasquantum.com:443, www.tasquantum.com:443` | `.../ssl/tasquantum.com/` | `environments/production/projects/tasquantum/` |
| `abpd.graspvisual.com` | `abpd.graspvisual.com:443` | `.../ssl/abpd.graspvisual.com/` | `environments/production/projects/abpd/` |

`timekeeper` also has **legacy redirects** on `app.graspvisual.com` (`/timekeeper` → `time.graspvisual.com`) in the same `Caddyfile`.

---

## Checklist (custom domain)

### 1. DNS

- Point the apex (and `www` if used) **A/AAAA records** to this VPS’s public IP.
- Confirm from the VPS: `dig +short <your-domain>` matches the host IP.

Same prerequisite as [../setup/SSL_CERTIFICATE_SETUP.md](../setup/SSL_CERTIFICATE_SETUP.md): port **80** must be reachable for ACME HTTP-01.

### 2. Application deploy

- Product stack must be running and healthy **before** exposing the domain (compose in `environments/production/projects/<project>/`).
- Note upstream **container names** and ports for Caddy (e.g. `growplan-api-prod:5001`, `growplan-frontend-prod:80`).

### 3. TLS certificates

Shared hosts (`app.graspvisual.com`, etc.) are handled by `/vps/scripts/setup-ssl-certificates.sh` (see setup guide).

**Per-domain workflow** (matches manual steps in `SSL_CERTIFICATE_SETUP.md`):

```bash
DOMAIN="your-product.example.com"
SSL_DIR="/vps/infrastructure/reverse-proxy/ssl/${DOMAIN}"
mkdir -p "$SSL_DIR"

# Placeholder so Caddy can start with tls directive (if needed before real cert)
openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
  -keyout "${SSL_DIR}/privkey.pem" \
  -out "${SSL_DIR}/fullchain.pem" \
  -subj "/CN=${DOMAIN}"
chmod 644 "${SSL_DIR}/fullchain.pem"
chmod 600 "${SSL_DIR}/privkey.pem"

# Obtain Let's Encrypt cert (requires :80 ACME + DNS pointing here)
/vps/infrastructure/reverse-proxy/scripts/certbot-auto.sh "${DOMAIN}"

# Multi-domain example (cert name = first argument → ssl/<primary>/)
# /vps/infrastructure/reverse-proxy/scripts/certbot-auto.sh tasquantum.com www.tasquantum.com
# Or use /vps/scripts/setup-tasquantum-ssl.sh (validates apex DNS before issuance)

# Copy LE certs into reverse-proxy ssl dir
/vps/scripts/copy-certificates.sh
```

`copy-certificates.sh` discovers domains under `/etc/letsencrypt/live/` automatically; a static fallback list includes `growplan.app` and `time.graspvisual.com`.

Renewal: `/vps/scripts/renew-all-certificates.sh` (runs `certbot renew`, then `copy-certificates.sh`).

Optional check: `/vps/scripts/verify-ssl.sh` — domain list includes `app.graspvisual.com`, `store.graspvisual.com`, `growplan.app`, `time.graspvisual.com`, `tasquantum.com` (covers apex + www HTTPS), `app-test.graspvisual.com`, `app-dev.graspvisual.com`.

### 4. Caddy site block (not path snippet)

Generated `caddy.production.snippet.txt` targets **`app.graspvisual.com:443`** path routes. For a custom domain, add a **separate site block** in `/vps/infrastructure/reverse-proxy/Caddyfile`, following existing patterns:

- `:80` block with `/.well-known/acme-challenge/*` and redirect to HTTPS
- `:443` block with:
  - `tls /etc/caddy/ssl/<domain>/fullchain.pem /etc/caddy/ssl/<domain>/privkey.pem`
  - `reverse_proxy` to your service `container_name:port`
  - Security headers as required by the app (see `growplan` / `timekeeper` blocks for CSP differences)

Validate and apply (see [../setup/REVERSE_PROXY.md](../setup/REVERSE_PROXY.md)):

```bash
/vps/scripts/ensure-reverse-proxy-env.sh
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose restart caddy
/vps/scripts/verify-caddy-routes.sh
```

### 5. Portal and licensing (if applicable)

- Set Portal `appUrl` to `https://<your-domain>` in `portal/src/config/apps/<appId>.ts`.
- Redeploy Portal after config changes: `/vps/scripts/deploy.sh production portal`
- Licensed products: full loop in [LICENSING_AND_STORE_INTEGRATION.md](LICENSING_AND_STORE_INTEGRATION.md) § D–E.

### 6. Verify

```bash
curl -I "https://<your-domain>/health"   # or your documented health path
/vps/scripts/health-check.sh production <project-name>
```

---

## Related

- [VPS_PROJECTS_REGISTRY.md](VPS_PROJECTS_REGISTRY.md) — which products use custom domains today  
- [NON_STANDARD_COMPOSE_LAYOUTS.md](NON_STANDARD_COMPOSE_LAYOUTS.md) — multi-service / in-repo build patterns  
- [../setup/SSL_CERTIFICATE_SETUP.md](../setup/SSL_CERTIFICATE_SETUP.md) — shared environment hosts and troubleshooting
