<div align="center">
  <img src="https://cloudflareimg.cdn.sn/i/695929a70c0bc_1767451047.webp" alt="Veloera CE Logo" width="180" />
  <h1>VeloeraCE</h1>
  <p>Community-maintained Veloera, optimized for production operations</p>
  <p>
    <a href="./README.md">简体中文</a> | English
  </p>
  <p>
    <a href="./LICENSE"><img alt="License: GPLv3" src="https://img.shields.io/badge/License-GPLv3-orange.svg" /></a>
    <img alt="Go" src="https://img.shields.io/badge/Go-1.23+-00ADD8?logo=go" />
    <img alt="Node" src="https://img.shields.io/badge/Node-20+-339933?logo=node.js" />
    <img alt="Docker" src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker" />
  </p>
</div>

## Overview

`VeloeraCE (Community Edition)` is a community-driven LLM API gateway evolved from `Veloera`.

Project goals:

- Sustain and maintain core upstream capabilities
- Improve reliability and operability in production
- Build a transparent, contributor-friendly community workflow

Upstream projects:

- Veloera: <https://github.com/Veloera/Veloera>
- new-api: <https://github.com/QuantumNous/new-api>

## Core Features

- Unified OpenAI-compatible API layer
- Multi-channel model routing
- Web admin console (channels, users, tokens, logs, billing)
- One-command Docker Compose deployment
- Open contribution and review process

## Tech Stack

- Backend: Go + Gin + GORM
- Frontend: React + Vite + Semi UI
- Database: MySQL / PostgreSQL / SQLite (configurable)
- Cache: Redis (optional)

## Quick Start

### Option 1: Docker Compose (Recommended)

1. Clone repository

```bash
git clone https://github.com/moehans-official/VeloeraCE.git
cd VeloeraCE
```

2. Prepare environment variables

```bash
cp .env.example .env
```

3. Pull prebuilt image from Docker Hub

```bash
docker pull veloerace/veloerace:latest
```

4. Ensure `veloera.image` in `docker-compose.yml` is `veloerace/veloerace:latest`

5. Start services

```bash
docker compose up -d
```

6. Verify health

```bash
curl http://localhost:3000/api/healthz
curl http://localhost:3000/api/readyz
```

Default URL: `http://localhost:3000`

### Option 2: Local Development

1. Build frontend assets (embedded by backend)

```bash
cd web
pnpm install
pnpm run build
cd ..
```

2. Start backend

```bash
go run main.go
```

3. Run frontend dev server (optional)

```bash
cd web
pnpm run dev
```

## Ops and Health Probes

- Liveness: `GET /api/healthz`
- Readiness: `GET /api/readyz` (checks DB/Redis)

Hardening env vars (partial list):

- `TRUSTED_PROXIES`
- `SERVER_READ_TIMEOUT`
- `SERVER_WRITE_TIMEOUT`
- `SERVER_IDLE_TIMEOUT`
- `SERVER_SHUTDOWN_TIMEOUT`
- `SECURITY_HSTS_MAX_AGE`
- `SECURITY_HSTS_FORCE`
- `SECURITY_CONTENT_SECURITY_POLICY`

## License

Licensed under [`GNU GPLv3`](./LICENSE).
