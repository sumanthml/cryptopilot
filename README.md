# CryptoPilot 🔐

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![CI](https://github.com/YOUR_GITHUB_USERNAME/CryptoPilot/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_GITHUB_USERNAME/CryptoPilot/actions/workflows/ci.yml)

> **CryptoPilot** is a production-grade cryptographic modernisation platform that automatically discovers legacy cryptographic usage in Python and JavaScript/TypeScript codebases, scores their quantum-era risk, and guides development teams through safe, tested migration to modern algorithms — all from a clean web interface powered by AI.

> 📖 **Comprehensive Project & Feature Guide**: For a complete, bit-by-bit breakdown of every feature, real-world relevance, and peer presentation notes, see [PROJECT_NOTE.md](PROJECT_NOTE.md).

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Database Design](#database-design)
- [Scanner Methodology](#scanner-methodology)
- [Risk Scoring Methodology](#risk-scoring-methodology)
- [Deployment Guide](#deployment-guide)
- [Screenshots](#screenshots)
- [Limitations](#limitations)
- [License](#license)

---

## Overview

CryptoPilot addresses a critical gap in the software supply chain: most organisations do not know which cryptographic algorithms their codebases use, whether those algorithms are deprecated, or how urgently they need to migrate. CryptoPilot solves this in three integrated modules:

| Module | What it does |
|--------|-------------|
| **Scanner** | AST-based Python source analysis discovers every crypto primitive used: algorithm, key size, operation, library, file location, and confidence level. Exports findings as a CycloneDX v1.6 CBOM. |
| **Risk Engine** | Deterministic multi-factor scoring (0–100) assigns a risk level to each finding. Factors include algorithm quantum-safety, NIST PQC status, key size adequacy, protocol version, and contextual usage. |
| **Migration Lab** | Isolated experiment runner applies code patches inside a temporary environment, executes your existing test suite, runs benchmarks, and reports pass/fail + performance delta — before you touch production. |

A fourth cross-cutting capability, **CryptoWatch**, monitors OSV.dev and PyPI advisories for new vulnerabilities affecting your detected cryptographic libraries and alerts you to drift between scan snapshots.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React SPA)                       │
│  Dashboard | Scanner | Risk | Migration Lab | CryptoWatch | CBOM │
└──────────────────────┬──────────────────────────────────────────┘
                       │  HTTPS / REST API
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│               FastAPI Backend  (Python 3.12)                     │
│                                                                  │
│  ┌────────────┐  ┌───────────┐  ┌──────────────┐  ┌──────────┐ │
│  │  Scanner   │  │  Risk     │  │  Migration   │  │ Advisory │ │
│  │  Service   │  │  Engine   │  │  Lab         │  │ Fetcher  │ │
│  └─────┬──────┘  └─────┬─────┘  └──────┬───────┘  └────┬─────┘ │
│        │               │               │                │        │
│  ┌─────▼───────────────▼───────────────▼────────────────▼─────┐ │
│  │          SQLAlchemy 2.0  ◄──────►  Alembic Migrations       │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
│                            │                                      │
│  ┌─────────────────────────▼───────────────────────────────────┐ │
│  │            AI Cascade: Groq → Gemini → Rule-Based            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │  SSL / pgwire
                               ▼
                    ┌─────────────────────┐
                    │  Supabase Postgres   │
                    │  (hosted PostgreSQL) │
                    └─────────────────────┘

External APIs: OSV.dev · PyPI · Groq Cloud · Google Gemini · Firebase Auth
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | UI |
| Routing | React Router v7 | SPA navigation |
| Styling | Tailwind CSS | Utility-first CSS |
| Charts | Recharts | Risk dashboards |
| Graph | @xyflow/react | Dependency graph |
| Icons | Lucide React | Consistent iconography |
| Build | Vite 5 | Frontend bundler |
| Backend | FastAPI 0.115 | REST API framework |
| Runtime | Python 3.12 | Backend language |
| ORM | SQLAlchemy 2.0 | Database abstraction |
| Migrations | Alembic | Schema versioning |
| Database | PostgreSQL 15 (Supabase) | Persistent storage |
| Auth | Firebase Authentication | Google/email login |
| AI | Groq (LLaMA 3.3 70B) + Gemini 1.5 | AI explanations |
| Advisory | OSV.dev + PyPI JSON API | Vulnerability feeds |
| CBOM | CycloneDX v1.6 | Supply chain standard |
| Container | Docker + Docker Compose | Local development |
| CD | Render (backend) + Vercel (frontend) | Production hosting |
| CI | GitHub Actions | Automated testing |

---

## Features

### 🔍 Scanner Module
- AST-based static analysis of Python source files (no code execution required)
- Detects 40+ cryptographic patterns across `hashlib`, `cryptography`, `pycryptodome`, `ssl`, `hmac`, `secrets`, `jwt` libraries
- Reports: algorithm name, operation, file path, line number, function name, library, detection method, confidence score (0–1), severity
- Exports CycloneDX v1.6 CBOM JSON for integration with supply-chain tooling
- Dependency graph visualisation using networkx + React Flow
- Demo project included for instant evaluation

### ⚠️ Risk Engine Module
- Deterministic 0–100 risk score per finding — no ML black box
- Six weighted factors: algorithm safety, NIST PQC status, key size, protocol version, usage context, library currency
- Three risk levels: Low (0–39), Medium (40–69), High (70–100)
- Per-project risk dashboard with breakdown by severity, algorithm, and module
- Full factor explanation with weights for auditability

### 🧪 Migration Lab Module
- Isolated patch application in a temporary directory (original files never touched)
- Automatic test runner: executes existing `pytest` suite against the patched code
- Benchmark runner: `timeit`-based performance comparison (baseline vs. candidate)
- Structured results: pass/fail counts, test output, latency delta, throughput change
- AI-generated migration plan with step-by-step instructions

### 👁️ CryptoWatch Module
- Polls OSV.dev vulnerability database for each detected cryptographic library
- Checks PyPI JSON API for latest versions vs. installed versions
- Drift detection: compares two scan snapshots and highlights new, removed, or changed findings
- Advisory storage and per-project matching
- Offline fallback to curated local advisories

### 🤖 AI Assistant
- Floating chat bubble available on every page
- Cascading provider: Groq (key rotation on 429) → Gemini → deterministic rule-based
- Sends current page context with each question
- Quick prompts: "Where am I?", "What are the risks?", "What should I do next?"
- Provider attribution on each response

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 20 LTS
- Docker + Docker Compose (optional but recommended)
- A [Supabase](https://supabase.com) project (free tier works)
- A [Firebase](https://console.firebase.google.com) project with Authentication enabled

### 1. Clone

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/CryptoPilot.git
cd CryptoPilot
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — add DATABASE_URL, GROQ_API_KEY, GEMINI_API_KEY, FIREBASE_PROJECT_ID

# Frontend
cp frontend/.env.example frontend/.env   # if present
# Or set VITE_API_BASE_URL=http://localhost:8000 in frontend/.env
```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

### 4. Run Without Docker

```bash
# Windows (PowerShell)
.\scripts\setup_dev.ps1

# Backend
cd backend
.\.venv\Scripts\activate
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm run dev   # → http://localhost:5173
```

---

## API Documentation

The FastAPI backend auto-generates interactive API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

See [docs/api.md](docs/api.md) for a full endpoint reference with request/response examples.

---

## Database Design

CryptoPilot uses PostgreSQL (Supabase) with the following core entities:

```
User ──< Project ──< Scan ──< CryptoFinding
                           └─< RiskAssessment
                   └─< MigrationPlan ──< MigrationExperiment ──< TestResult
                                                              └─< BenchmarkResult
         └─< DriftEvent
Advisory ──< ProjectAdvisoryMatch >── Project
AuditEvent
```

See [docs/database.md](docs/database.md) for the complete schema documentation.

---

## Scanner Methodology

The scanner uses Python's built-in `ast` module to parse source files without executing them. For each `.py` file it:

1. Builds an AST from source text
2. Walks `Import`, `ImportFrom`, `Call`, and `Assign` nodes
3. Matches node patterns against a curated library of 40+ cryptographic signatures
4. For each match, records: algorithm, key-size (if determinable), operation, file path, line number, calling function, detection method, evidence string, and a confidence score (0.6–1.0)

Confidence is reduced for indirect usage patterns (e.g., variable-indirected key sizes) and increased when both the import and the API call are confirmed.

See [docs/scanner.md](docs/scanner.md) for the full detection pattern catalogue.

---

## Risk Scoring Methodology

Each finding receives a 0–100 risk score calculated from six weighted factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| Algorithm Safety | 35% | Is the algorithm quantum-safe? Broken? Deprecated? |
| NIST PQC Status | 20% | Is a NIST-standardised replacement available? |
| Key Size | 15% | Is the key size below recommended minimums? |
| Protocol Version | 10% | Deprecated TLS/SSL version in use? |
| Usage Context | 10% | High-value context (key exchange, signature) vs. low-value (hashing) |
| Library Currency | 10% | Is the library version known-vulnerable or end-of-life? |

`risk_score = Σ(weight_i × score_i) × 100`

Risk levels: **Low** (0–39) · **Medium** (40–69) · **High** (70–100)

See [docs/risk-engine.md](docs/risk-engine.md) for the full formula, factor tables, and worked examples.

---

## Deployment Guide

### Backend → Render

1. Push your code to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Connect your GitHub repo; set **Root Directory** to `backend`.
4. Build command: `pip install -r requirements.txt`
5. Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in the Render dashboard:
   - `DATABASE_URL` (Supabase connection string)
   - `GROQ_API_KEY`, `GROQ_API_KEY2`, `GEMINI_API_KEY`
   - `FIREBASE_PROJECT_ID`
   - `CRYPTOPILOT_SECRET_KEY` (use **Generate Value**)
   - `CRYPTOPILOT_CORS_ORIGINS` (your Vercel URL)
7. Alternatively, use `render.yaml` (Infrastructure as Code) — just link your repo in the Render Blueprint dashboard.

### Frontend → Vercel

1. Import your GitHub repo on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite**.
4. Add environment variable:
   - `VITE_API_BASE_URL=https://cryptopilot-backend.onrender.com`
5. The `vercel.json` in the repo root handles SPA rewrites, security headers, and API proxying automatically.

---

## Screenshots

> *Screenshots will be added after the UI is complete.*
>
> Planned: Dashboard overview · Scanner results · Risk heatmap · Migration Lab · CryptoWatch feed · CBOM export · AI assistant drawer

---

## Limitations

This project is an academic capstone. Known limitations include:

- **Python-only scanner**: The AST scanner only analyses Python source files. Java, Go, C++, etc. are not supported.
- **Static analysis**: Dynamic crypto usage (e.g., algorithms loaded from config at runtime) may not be detected.
- **No formal security audit**: The backend has not undergone penetration testing.
- **Migration Lab sandboxing**: The lab runs `subprocess` calls in a temp directory; it is not a full container sandbox.
- **AI accuracy**: The AI assistant provides explanations, not certified security advice. Always consult a qualified cryptographer for production decisions.
- **Free-tier constraints**: Render free-tier services sleep after 15 minutes of inactivity; first request after sleep may be slow.
- **Advisory coverage**: Only Python packages on OSV.dev/PyPI are monitored. C/system-level crypto libraries are not tracked.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

*Built as a final-year capstone project. Not affiliated with NIST, Supabase, Groq, Google, or Firebase.*
