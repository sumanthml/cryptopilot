# Architecture — CryptoPilot

## Overview

CryptoPilot is a three-tier web application: a React SPA frontend, a FastAPI backend, and a PostgreSQL database (Supabase). All three tiers are stateless in the sense that horizontal scaling is possible; persistent state lives exclusively in the database.

---

## Component Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              User Browser                                 │
│                                                                           │
│  React 18 SPA (TypeScript, Vite)                                         │
│  ┌────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────┐  │
│  │ Dashboard  │ │ Scanner  │ │ Migration Lab│ │CryptoWatch│ │  CBOM   │  │
│  └──────┬─────┘ └────┬─────┘ └──────┬───────┘ └────┬─────┘ └────┬────┘  │
│         │             │              │               │             │       │
│  ┌──────▼─────────────▼──────────────▼───────────────▼─────────────▼──┐  │
│  │                    API Client Layer (axios / fetch)                  │  │
│  │              Firebase Auth SDK  ──  ID Token in Bearer              │  │
│  └──────────────────────────────────┬──────────────────────────────────┘  │
└─────────────────────────────────────│──────────────────────────────────────┘
                                      │ HTTPS + JWT Bearer
                                      ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend  (Python 3.12)                        │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Routers: auth · projects · scans · findings · risk · migrations    │ │
│  │           watch · cbom · reports · ai                               │ │
│  └────────────────────────────┬────────────────────────────────────────┘ │
│                               │                                           │
│  ┌──────────────┐  ┌──────────▼──────────┐  ┌─────────────────────────┐ │
│  │  Scanner     │  │  Risk Engine        │  │  Migration Lab          │ │
│  │  (AST-based) │  │  (deterministic)    │  │  (subprocess isolation) │ │
│  └──────────────┘  └─────────────────────┘  └─────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  AI Cascade: Groq (key1→key2 on 429) → Gemini → Rule-based         │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────┐  ┌────────────────────────────────────────────┐│
│  │  Advisory Fetcher    │  │  CBOM Generator (CycloneDX v1.6)           ││
│  │  OSV.dev + PyPI API  │  └────────────────────────────────────────────┘│
│  └──────────────────────┘                                                 │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  SQLAlchemy 2.0 ORM  ◄────► Alembic Migration Engine                │ │
│  └──────────────────────────────┬───────────────────────────────────────┘ │
└──────────────────────────────────│──────────────────────────────────────────┘
                                   │ SSL / pgwire (port 5432)
                                   ▼
                        ┌────────────────────────┐
                        │  Supabase PostgreSQL    │
                        │  (hosted, row-level     │
                        │   security enabled)     │
                        └────────────────────────┘

External Services:
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ Firebase Auth │  │  Groq Cloud  │  │Google Gemini │  │   OSV.dev    │
  │  (ID tokens)  │  │(LLaMA 3.3)  │  │ (Gemini 1.5) │  │   PyPI API   │
  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

---

## Request Lifecycle

1. **Authentication**: The browser exchanges Firebase credentials for a Firebase ID token (JWT). Every API request includes this token as `Authorization: Bearer <token>`.

2. **Token Verification**: The FastAPI `get_current_user` dependency downloads Google's public RSA keys from `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`, verifies the token signature and claims, and returns the `firebase_uid`.

3. **User Upsert**: On first login, `POST /api/auth/firebase-login` creates a `User` row keyed on `firebase_uid`.

4. **Scan Flow**:
   a. Client `POST /api/projects/{id}/scan` with file content (multipart) or a Git URL.
   b. Backend creates a `Scan` record and enqueues the scan via FastAPI `BackgroundTasks`.
   c. The scanner service walks AST nodes, creates `CryptoFinding` rows, and updates the `Scan` status to `completed`.
   d. Risk Engine scores each finding; `RiskAssessment` rows are written.
   e. CBOM Generator builds the CycloneDX JSON on demand.

5. **AI Requests**: `POST /api/ai/ask` → AI Cascade service tries Groq key1, then key2 (on 429), then Gemini, then falls back to deterministic rule-based answers.

---

## Security Boundaries

| Boundary | Mechanism |
|----------|----------|
| Auth | Firebase ID token (RS256 JWT), verified server-side |
| DB isolation | Supabase Row-Level Security + application-level `user_id` checks |
| Secret storage | Environment variables; never in source code |
| Migration Lab | Temp directory isolation; subprocess timeout; no network in subprocess |
| CORS | Explicit origin allowlist in `CRYPTOPILOT_CORS_ORIGINS` |

---

## Deployment Architecture

```
GitHub → CI (GitHub Actions) → Render (backend) + Vercel (frontend)
                                      │
                              Supabase Postgres
```

- **Render** runs the FastAPI backend as a web service (Python runtime, auto-TLS).
- **Vercel** serves the pre-built Vite bundle as static files via its global CDN; SPA rewrites via `vercel.json`.
- **Supabase** provides managed PostgreSQL with connection pooling (pgBouncer) and optional RLS.

---

## Directory Structure

```
CryptoPilot/
├── backend/
│   ├── app/
│   │   ├── core/          # config, security, AI cascade, logging
│   │   ├── db/            # SQLAlchemy engine, session, models
│   │   ├── routers/       # one file per API resource group
│   │   └── services/      # scanner, risk, migration, advisory, CBOM, drift, graph
│   ├── alembic/           # migration versions
│   ├── tests/             # pytest test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/           # typed API client functions
│   │   ├── components/    # reusable UI components
│   │   ├── pages/         # route-level page components
│   │   ├── hooks/         # custom React hooks
│   │   ├── types/         # TypeScript interfaces
│   │   └── utils/         # helpers, constants
│   ├── Dockerfile
│   └── nginx.conf
├── docs/                  # extended documentation
├── scripts/               # dev setup and seeding scripts
├── sample-project/        # demo Python project for scanning
├── docker-compose.yml
├── render.yaml
├── vercel.json
└── .github/
    ├── workflows/ci.yml
    ├── ISSUE_TEMPLATE/
    └── CONTRIBUTING.md
```
