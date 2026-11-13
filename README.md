# DCP Construction

Marketing site for DCP Construction — commercial and industrial interior trades in Houston and surrounding Texas markets.

## Stack

- Vite + Tailwind CSS v4
- Static HTML homepage built from Figma Auto Layout frames
- Express server with `GET /health` for VPS monitoring
- Docker image for `dcp.graspvisual.com`

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm start
```

Health check: `GET /health` → `{ "status": "healthy" }`

## VPS notes

- Staging hostname: `dcp.graspvisual.com`
- App listens on `PORT` (default `4001`)
- Dockerfile is non-root with a Node health probe on `127.0.0.1`
