# Deploy — CartWise Backend

Guide for deploying the backend on a Linux VPS, running as a non-root user, behind Nginx + PM2, with Cloudflare handling TLS.

- **App port:** `3003` (configurable via `.env`)
- **Process manager:** PM2 (fork mode)
- **Reverse proxy:** Nginx → `127.0.0.1:3003`
- **TLS:** Cloudflare proxy (orange cloud) — origin can use Let's Encrypt or Cloudflare Origin Cert

> Prerequisites: Node, pnpm, PM2, and Nginx installed on the VPS. The subdomain `cartwise.yourdomain.com` already exists in Cloudflare pointing to the VPS IP.

---

## 1. Environment variables

The project uses `@nestjs/config` and reads a `.env` at the root. The `.env` is **not** committed to git. Use `.env.example` as reference.

`.env` for production:

```env
PORT=3003
CORS_ORIGIN=https://cartwise.yourdomain.com
```

> If a mobile client (Expo/React Native) consumes the API directly, add its origins to `CORS_ORIGIN` as a comma-separated list. Native requests (no `Origin` header) are not blocked by CORS.

---

## 2. Clone and build

```bash
cd ~
git clone <REPO_URL> cartwise-backend
cd cartwise-backend

pnpm install

cp .env.example .env
nano .env   # set PORT and CORS_ORIGIN

pnpm build
```

This compiles TypeScript to `dist/main.js`, the entrypoint used by PM2.

---

## 3. Run with PM2

The repo includes `ecosystem.config.js`. Adjust `cwd` if you cloned to a different path (default: `/home/<user>/cartwise-backend`).

```bash
cd ~/cartwise-backend

pm2 start ecosystem.config.js

pm2 status
pm2 logs cartwise-backend --lines 30

# Persist across reboots
pm2 save
pm2 startup   # follow the printed instruction
```

Test locally on the VPS:

```bash
curl http://127.0.0.1:3003/products | head
```

---

## 4. Nginx

Create `/etc/nginx/sites-available/cartwise.yourdomain.com`:

```nginx
server {
    listen 80;
    server_name cartwise.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/cartwise.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. TLS / Cloudflare

**Option A — Flexible (simpler):**
- Cloudflare dashboard: SSL/TLS → **Flexible**.
- Nginx stays on `:80`. Cloudflare handles HTTPS with the client.
- Traffic between Cloudflare and the VPS is HTTP. Acceptable for this project.

**Option B — Full Strict (recommended):**
- SSL/TLS → **Full (strict)**.
- Generate a Cloudflare Origin Certificate and install on the VPS, or use Certbot:

```bash
sudo certbot --nginx -d cartwise.yourdomain.com
```

Make sure the DNS record has the **proxy enabled** (orange cloud) pointing to the VPS IP.

---

## 6. Verify

```bash
curl https://cartwise.yourdomain.com/products
curl https://cartwise.yourdomain.com/recommendations/trending
```

Interactive dashboard:

```
https://cartwise.yourdomain.com/
```

---

## 7. Future deploys

```bash
cd ~/cartwise-backend
git pull
pnpm install
pnpm build
pm2 restart cartwise-backend
```

---

## Notes

- **In-memory state:** data (events, list, purchases) lives in RAM. Every `pm2 restart` or reboot resets everything — expected behavior for this project (no database). To repopulate demo data, run the seed script pointing to the public URL or `127.0.0.1:3003`.
- **No auth:** intentional. The API is public; `user-id` is passed via header without validation.
- **Memory limit:** PM2 restarts the process if it exceeds 300MB (`max_memory_restart` in ecosystem config), which also clears accumulated in-memory state.
