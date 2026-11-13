# SSL Certificate Setup Guide

**Last Updated:** 2026-06-07  
**See also:** [REVERSE_PROXY.md](REVERSE_PROXY.md) (Caddy runtime, `.env`, validate/restart commands)

This guide explains how to set up SSL certificates for all environments using Let's Encrypt.

## Quick Start

On your VPS, run:

```bash
cd /vps
git pull origin main
chmod +x scripts/setup-ssl-certificates.sh
./scripts/setup-ssl-certificates.sh
```

This script will:
1. Run `/vps/scripts/ensure-reverse-proxy-env.sh` (Grafana edge credentials + TLS file permissions)
2. Ensure the reverse proxy is running (needed for ACME challenges)
3. Create placeholder certificates so the reverse proxy can start with HTTPS blocks enabled
4. Obtain real Let's Encrypt certificates via ACME challenge
5. Copy certificates to the correct reverse-proxy SSL directory
6. Validate and restart the reverse proxy with real certificates
7. Verify certificates are valid

## Prerequisites

Before running the SSL setup:

1. **DNS must be configured**: All domains must point to your VPS IP
   - `app.graspvisual.com` → Your VPS IP
   - `app-test.graspvisual.com` → Your VPS IP
   - `app-dev.graspvisual.com` → Your VPS IP (optional)

2. **Port 80 must be accessible**: Let's Encrypt needs to access port 80 for ACME challenges
   ```bash
   # Verify port 80 is open
   sudo ufw status | grep 80
   # If not open:
   sudo ufw allow 80/tcp
   ```

3. **The reverse proxy must be able to start**: Bootstrap env first, then start Caddy:

```bash
/vps/scripts/ensure-reverse-proxy-env.sh
cd /vps/infrastructure/reverse-proxy
docker compose up -d
```

The proxy must bind to ports 80 and 443. TLS private keys under `ssl/` must be readable by the non-root `caddy` user (UID 1000); `ensure-reverse-proxy-env.sh` sets `644` on `*.pem` files.

## Manual Certificate Setup (Alternative)

If the automated script doesn't work, you can set up certificates manually:

### Step 1: Create SSL Directories

```bash
mkdir -p /vps/infrastructure/reverse-proxy/ssl/app.graspvisual.com
mkdir -p /vps/infrastructure/reverse-proxy/ssl/app-test.graspvisual.com
mkdir -p /vps/infrastructure/reverse-proxy/ssl/app-dev.graspvisual.com
```

### Step 2: Create Placeholder Certificates (So the Reverse Proxy Can Start)

```bash
# For each domain
DOMAIN="app.graspvisual.com"
SSL_DIR="/vps/infrastructure/reverse-proxy/ssl/${DOMAIN}"

openssl req -x509 -nodes -days 1 -newkey rsa:2048 \
    -keyout "${SSL_DIR}/privkey.pem" \
    -out "${SSL_DIR}/fullchain.pem" \
    -subj "/CN=${DOMAIN}"

chmod 644 "${SSL_DIR}/fullchain.pem"
chmod 600 "${SSL_DIR}/privkey.pem"
```

### Step 3: Start the Reverse Proxy

```bash
cd /vps/infrastructure/reverse-proxy
docker compose up -d
```

### Step 4: Obtain Real Certificates

```bash
# Single domain
DOMAIN="app.graspvisual.com"
/vps/infrastructure/reverse-proxy/scripts/certbot-auto.sh "${DOMAIN}"

# Multi-domain (cert stored under primary name directory)
/vps/infrastructure/reverse-proxy/scripts/certbot-auto.sh tasquantum.com www.tasquantum.com
```

For TasQuantum apex + www with DNS validation: `/vps/scripts/setup-tasquantum-ssl.sh`

### Step 5: Copy Certificates to Reverse Proxy Directory

```bash
/vps/scripts/copy-certificates.sh
```

### Step 6: Reload Reverse Proxy

```bash
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose restart caddy
```

## Certificate Locations

- **Let's Encrypt storage**: `/etc/letsencrypt/live/{domain}/`
- **Reverse-proxy SSL directory**: `/vps/infrastructure/reverse-proxy/ssl/{domain}/`

The certificates are automatically copied from Let's Encrypt into the reverse-proxy directory by the scripts.

## Certificate Renewal

Certificates are automatically renewed via cron. The renewal script is at:
- `/vps/scripts/renew-all-certificates.sh`

To manually renew:

```bash
/vps/scripts/renew-all-certificates.sh
```

If the distro package enabled `certbot.timer`, disable it so renewal only runs through the repo-managed script:

```bash
sudo systemctl disable --now certbot.timer
sudo systemctl reset-failed certbot.service
```

## Verification

### Check Certificate Files Exist

```bash
ls -la /vps/infrastructure/reverse-proxy/ssl/app.graspvisual.com/
# Should show: fullchain.pem and privkey.pem
```

### Check Certificate Validity

```bash
openssl x509 -in /vps/infrastructure/reverse-proxy/ssl/app.graspvisual.com/fullchain.pem -text -noout | grep -A 2 "Validity"
```

### Test HTTPS Endpoint

```bash
curl -I https://app.graspvisual.com
# Should return 200 or 301/302 (not SSL errors)
```

### Verify Reverse-Proxy Configuration

```bash
/vps/scripts/ci/validate-caddyfile.sh
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
/vps/scripts/verify-caddy-routes.sh
```

## Troubleshooting

### Error: "Failed to obtain certificate"

**Possible causes:**
1. DNS not pointing to VPS
2. Port 80 not accessible from internet
3. Reverse proxy not running or not serving ACME challenges
4. Rate limiting from Let's Encrypt (too many requests)

**Solutions:**
```bash
# Check DNS
dig app.graspvisual.com

# Check port 80
sudo netstat -tlnp | grep :80

# Check the reverse proxy is serving ACME challenges
curl http://app.graspvisual.com/.well-known/acme-challenge/test
# Should return 404 (not connection refused)

# Check reverse-proxy logs
docker logs vps-reverse-proxy | tail -20
```

### Error: "Reverse proxy fails to start with SSL certificate errors"

**Solution:** The placeholder certificates might be missing. Re-run the setup script or create them manually (see Step 2 above).

### Error: "Certificate exists but reverse proxy can't find it"

**Solution:** Certificates might be in Let's Encrypt directory but not copied to the reverse-proxy directory:
```bash
/vps/scripts/copy-certificates.sh
```

### Error: "SSL certificate expired"

**Solution:** Renew the certificate:
```bash
/vps/scripts/renew-all-certificates.sh
```

## Enabling HTTP to HTTPS Redirect

For the current Caddy-based stack, production/testing HTTP redirects live in `/vps/infrastructure/reverse-proxy/Caddyfile`.

1. Ensure each `:80` site block serves `/.well-known/acme-challenge/*` from `/var/www/certbot`.
2. Add or keep the redirect:

```caddy
redir https://app.graspvisual.com{uri} 301
```

3. Validate and restart the reverse proxy:
```bash
cd /vps/infrastructure/reverse-proxy
docker compose exec -T caddy caddy validate --config /etc/caddy/Caddyfile
docker compose restart caddy
```

## Security Notes

- Certificates are stored with proper permissions (`644` for cert and key — required for non-root Caddy)
- Private keys are never exposed or logged
- Certificates auto-renew before expiration
- HTTPS is enforced with HSTS headers
- Only TLS 1.2 and 1.3 are supported
