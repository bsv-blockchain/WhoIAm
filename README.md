# Who I Am

A self-sovereign identity verification service built on the BSV blockchain. Users verify their real-world identities (X handle, Google account, phone number) and receive cryptographic certificates stored in their own BSV wallet — not on your servers. They decide what to publish, what to keep private, and can revoke or delete at any time.

## How it works

1. **Verify** — the user authenticates with a third-party provider (X OAuth, Google OAuth, or SMS). The backend confirms the claim and issues a signed certificate.
2. **Own** — the certificate is written directly into the user's BSV wallet via `acquireCertificate`. The server never stores private data.
3. **Control** — the user optionally publishes the certificate to the `tm_identity` overlay network so other apps can resolve their identity key to a human-readable name. They can unpublish (spending the on-chain token) or delete entirely at any time.

## Architecture

```
┌─────────────────┐     BSV Auth (BRC-31)    ┌──────────────────┐
│  React Frontend │ ◄──────────────────────► │  Express Backend │
│  (Vite + Nginx) │                           │  (Node / BRC-31) │
└─────────────────┘                           └────────┬─────────┘
                                                       │
                                               ┌───────┴───────┐
                                               ▼               ▼
                                             Redis         BSV Wallet
                                         (OAuth sessions, (certifier
                                          verifications,   key + signing)
                                          rate limits)
```

- **Frontend** — React 18, Vite, Tailwind CSS, shadcn/ui, framer-motion
- **Backend** — Express, TypeScript, `@bsv/sdk`, `@bsv/auth-express-middleware`
- **Auth** — Every API call (except OAuth callbacks) is authenticated via BSV mutual auth headers (BRC-31). No JWTs, no sessions.
- **Certificates** — Issued using the BRC-56 certificate standard via `wallet.acquireCertificate`
- **Identity overlay** — Public revelation uses the `tm_identity` / `ls_identity` overlay network

## Prerequisites

- Docker and Docker Compose
- A BSV wallet with a funded key for the certifier server (`SERVER_PRIVATE_KEY`)
- Third-party API credentials (see below)

## Local development

**1. Clone and configure**

```bash
git clone <repo>
cd socialcert
cp .env.example .env
```

Edit `.env` and fill in all required values (see [Environment variables](#environment-variables)).

**2. Start all services**

```bash
docker compose up
```

Or with monitoring (Prometheus + Grafana):

```bash
docker compose --profile monitoring up
```

**3. Access the app**

| Service        | URL                         |
|----------------|-----------------------------|
| Frontend       | http://localhost:3000       |
| Backend API    | http://localhost:8080       |
| Prometheus     | http://localhost:9090 (monitoring) |
| Grafana        | http://localhost:3001 (monitoring) |

## Environment variables

Copy `.env.example` to `.env`. All variables are required unless marked optional.

### BSV / Wallet

| Variable | Description |
|----------|-------------|
| `SERVER_PRIVATE_KEY` | Hex-encoded private key for the certifier server wallet |
| `BSV_NETWORK` | `main` or `test` |
| `WALLET_STORAGE_URL` | (optional) Remote wallet storage URL |

### Redis

| Variable | Description |
|----------|-------------|
| `REDIS_PASSWORD` | Password for the Redis server — **required, change in production** |

`REDIS_URL` is constructed automatically from `REDIS_PASSWORD` in `docker-compose.yml`. Override directly only for an external Redis instance.

### Twilio (SMS verification)

Create a Verify service at [twilio.com/console](https://console.twilio.com).

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_SERVICE_SID` | Twilio Verify service SID |

### X / Twitter (OAuth 2.0)

Create an app at [developer.x.com](https://developer.x.com). Enable OAuth 2.0 with PKCE. Add the callback URI to the app's allowed redirect URIs.

| Variable | Description |
|----------|-------------|
| `X_CLIENT_ID` | OAuth 2.0 client ID |
| `X_CLIENT_SECRET` | OAuth 2.0 client secret |
| `X_REDIRECT_URI` | Must match what's registered in the X app. In production: `https://yourdomain.com/api/verify/x/callback` |

### Google (OAuth 2.0)

Create OAuth 2.0 credentials at [console.cloud.google.com](https://console.cloud.google.com). Add the callback URI as an authorised redirect URI.

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Must match what's registered in Google Cloud. In production: `https://yourdomain.com/api/verify/google/callback` |

### Application

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` or `production` |
| `HTTP_PORT` | Backend listen port (default: `8080`) |
| `HOSTING_DOMAIN` | Public URL of the backend (used in manifests) |
| `FRONTEND_URL` | Public URL of the frontend (used in CORS and OAuth redirects) |

### Monitoring (optional)

| Variable | Description |
|----------|-------------|
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password (default: `admin` — change in production) |

## Production deployment

The app is designed to run as Docker containers behind a reverse proxy (nginx, Caddy, Cloudflare Tunnel, etc.).

### Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate a strong `SERVER_PRIVATE_KEY` — fund the corresponding address with enough BSV to cover certificate issuance fees
- [ ] Set `REDIS_PASSWORD` to a strong random value
- [ ] Set `HOSTING_DOMAIN` and `FRONTEND_URL` to your public domain
- [ ] Update `X_REDIRECT_URI` and `GOOGLE_REDIRECT_URI` to your production domain and register them with the respective OAuth apps
- [ ] Put the backend and frontend behind TLS (OAuth providers require HTTPS)
- [ ] Use a secrets manager or CI/CD secrets for `.env` — never commit it
- [ ] Set `GRAFANA_ADMIN_PASSWORD` if running the monitoring profile

### Typical setup (single server)

```
Internet ──► Caddy / nginx (TLS termination)
                 ├── / ──────────────────► frontend:3000
                 └── /api ────────────────► backend:8080
```

Both services can be exposed directly or via a `docker compose` network with only the reverse proxy port-forwarded to the host.

### Scaling notes

- The backend is stateless — multiple replicas work fine as long as they share the same Redis instance
- Redis holds OAuth session state (10-min TTL), verification state (24h TTL), and rate-limit counters — required for OAuth PKCE flows and certificate issuance to work correctly across replicas

## API overview

All endpoints except OAuth callbacks require BSV mutual auth headers (BRC-31).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | Health check |
| `GET` | `/metrics` | None | Prometheus metrics |
| `GET` | `/api/verify/x/callback` | None (OAuth redirect) | X OAuth callback |
| `GET` | `/api/verify/google/callback` | None (OAuth redirect) | Google OAuth callback |
| `POST` | `/api/verify/x/auth-url` | BSV | Initiate X OAuth flow |
| `POST` | `/api/verify/google/auth-url` | BSV | Initiate Google OAuth flow |
| `POST` | `/api/verify/phone/send` | BSV | Send SMS verification code |
| `POST` | `/api/verify/phone/check` | BSV | Check SMS code and issue cert |
| `POST` | `/api/sign-certificate` | BSV | Sign a certificate (certifier endpoint) |
