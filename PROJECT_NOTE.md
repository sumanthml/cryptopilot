# CryptoPilot: Complete Project & Technical Guide

> **A Complete, Step-by-Step Overview of What This Application Does, Why It Matters in the Real World, and How Every Single Feature Operates.**  
> *Share this document with anyone (teammates, professors, evaluators, friends) to understand the entire CryptoPilot platform without needing to read through source code.*

---

## 1. What is CryptoPilot in Simple Words?

**CryptoPilot** is an enterprise-grade cybersecurity and cryptographic management platform.

In simple terms:
Every modern software application relies on cryptography—to hash passwords, encrypt customer credit cards, sign API authentication tokens, and protect database connections. However, **most companies have no idea what encryption algorithms are actually running inside their codebases**, how old they are, or whether hackers and quantum computers can break them.

CryptoPilot solves this by acting like an **automated MRI scanner and flight surgeon for your code's cryptography**:
1. It automatically inspects your code and detects every encryption, hashing, and signature algorithm.
2. It scores the risk of each algorithm based on current NIST and post-quantum standards.
3. It evaluates your compliance against 6 global cybersecurity laws (NIST, NSA CNSA 2.0, White House OMB, PCI-DSS, EU Cyber Resilience Act, and FIPS 140-3).
4. It generates ready-to-use code patches (`.patch` files) to upgrade legacy algorithms to quantum-safe replacements.
5. It monitors real-time global vulnerability feeds (CVEs, PyPI, npm, CISA KEV) to alert you whenever a crypto library becomes unsafe.

---

## 2. Why Does This Project Matter in the Real World?

### The "Harvest Now, Decrypt Later" (HNDL) Threat
Foreign adversaries and cybercriminal syndicates are actively intercepting and storing encrypted enterprise and government communications today. They cannot decrypt it yet with classical computers, but once a fault-tolerant **quantum computer** arrives (projected between 2029 and 2035), algorithms like **RSA, ECC, and Diffie-Hellman will break instantly** using Shor's Algorithm.

Any data encrypted today with a 10-year or 25-year secrecy requirement (financial records, medical histories, national security documents, customer passwords) is **already compromised** if it is not migrated to Post-Quantum Cryptography (PQC).

### Strict Global Regulatory Mandates
Governments and regulatory bodies around the world have enacted strict deadlines:
- **NSA CNSA 2.0 (USA)**: Mandates software and web services handling critical infrastructure to begin transitioning to quantum-safe algorithms by 2030, with full enforcement by 2035.
- **White House OMB M-23-02**: Orders all federal agencies and contractors to maintain a Cryptographic Bill of Materials (CBOM) and an actionable PQC migration plan.
- **PCI-DSS v4.0 (Global Financial Standard)**: Strict enforcement begins March 2025; completely bans algorithms like Single-DES, 2-key 3DES, RC4, and unauthenticated ECB encryption modes for payment data.
- **EU Cyber Resilience Act (CRA 2024/2847)**: Digital products sold in the European Single Market must have zero known cryptographic flaws and supply complete CBOM/SBOM inventories, under penalty of heavy fines.

### Real-World Industry Use Cases
- **Fintech & Banking**: Auditing payment gateways to ensure credit card data is encrypted using AES-256-GCM rather than obsolete DES or ECB modes.
- **Healthcare & Hospital Systems**: Ensuring patient health records (HIPAA) are protected by quantum-safe encryption that remains unbreakable for decades.
- **Cloud & SaaS Providers**: Generating verified CycloneDX 1.6 Cryptographic Bill of Materials (CBOM) to win enterprise vendor security reviews.
- **DevSecOps Pipelines**: Scanning pull requests before merging code so developers never introduce weak cryptographic primitives into production.

---

## 3. Bit-by-Bit Walkthrough of Every Screen & Feature

### 1. Frictionless Authentication & 1-Click Live Demo Mode (`/login`)
- **What it does**: Allows access via standard cloud authentication (Firebase) or **instant 1-Click Live Demo Mode** (`demo-enterprise-admin`).
- **Why it matters**: Evaluators, professors, and teammates can test the full platform immediately without configuring external cloud keys or database connections.
- **How it works**: Clicking "Explore Live Demo Mode" injects a secure demo session that automatically connects to an enterprise financial gateway sample project with pre-populated findings and migration plans.

---

### 2. Executive Security Dashboard (`/`)
The mission control center that presents the overall cryptographic posture at a single glance:
- **Live Post-Quantum Telemetry Banner**: Displays current UTC date and exact real-time countdown clocks:
  - **NSA CNSA 2.0 Deadline**: Days remaining until the 2030 post-quantum transition benchmark.
  - **White House OMB Deadline**: Days remaining until the 2035 federal modernization deadline.
- **Threat Intelligence Sync Status**: Shows the status of the automated background threat crawler (syncing CVE and NIST advisories every 2 hours).
- **Global Compliance Overview Card**: Live compliance score across international cybersecurity standards.
- **Total Cryptographic Assets Found**: Counts active algorithms, high/critical vulnerabilities, and migration candidates.
- **Interactive Visual Charts**:
  - *Algorithm Distribution*: Visual breakdown of symmetric, asymmetric, and hashing algorithms in use.
  - *Quantum Readiness Ratio*: Percentage of codebase protected by quantum-resistant algorithms vs. classical algorithms.
- **Quick Export Action**: One-click download of the CycloneDX 1.6 Cryptographic Bill of Materials (CBOM).

---

### 3. Codebase Discovery & In-Memory Code Playground (`/discover`)
The discovery module inspects source code for cryptographic calls:
- **Multi-Language AST Discovery Engine**:
  - Traverses Abstract Syntax Trees (AST) in Python code to catch imports (`hashlib`, `cryptography`, `pycryptodome`, `rsa`) and direct calls.
  - Scans JavaScript/TypeScript code (`crypto-js`, `node:crypto`, `jsonwebtoken`, `bcrypt`).
- **Instant In-Memory Code Playground**:
  - Test code on the fly without uploading files.
  - Includes **4 pre-built industry presets**:
    1. *Financial Payment Gateway*: Simulates broken credit card processing code using MD5 and DES.
    2. *Authentication Microservice*: Simulates legacy session tokens signed with SHA-1.
    3. *Legacy Database Connector*: Simulates legacy database credentials encrypted with Triple-DES.
    4. *Quantum-Safe Cryptographic Service*: Demonstrates modern, post-quantum code using FIPS 203 ML-KEM and AES-256-GCM.
- **Dual Export Options**:
  - **Export CycloneDX 1.6 CBOM (JSON)**: Authoritative machine-readable format required by government and enterprise audits.
  - **Export CSV Data Sheet**: Spreadsheet format for security reviews and project management.

---

### 4. Regulatory Compliance Audit Engine (`/compliance`)
An authoritative compliance module evaluating code against **6 international frameworks**:
1. **NIST SP 800-131A Rev. 2** (Transitioning the Use of Cryptographic Algorithms and Key Lengths)
2. **NSA CNSA 2.0** (Commercial National Security Algorithm Suite 2.0 for Post-Quantum)
3. **White House OMB M-23-02** (Migrating to Post-Quantum Cryptography & CBOM Mandate)
4. **PCI-DSS v4.0** (Payment Card Industry Data Security Standard Requirements 3.4 & 3.5)
5. **EU Cyber Resilience Act (CRA 2024/2847)** (Product Security for the EU Single Market)
6. **FIPS 140-3** (Security Requirements for Cryptographic Modules)

*Key Features*:
- **Scorecards**: Individual compliance score (0–100%) and status tag (`COMPLIANT`, `ACTION_REQUIRED`, `NON_COMPLIANT`) for each framework.
- **Clause-by-Clause Violation Breakdown**: Exact rule citation, detected algorithm, security impact explanation, and specific remediation advice.
- **Printable Regulatory Audit Report**: A clean, printer-optimized audit dossier ready for submission to compliance auditors, CISOs, or external reviewers.

---

### 5. Migration Lab & Patch Generator (`/lab`)
Provides an actionable upgrade path for every legacy algorithm discovered:
- **Candidate Compatibility Matrix**:
  - Compares legacy algorithms against modern and post-quantum replacements (e.g., RSA-1024 vs. RSA-3072 vs. ML-KEM-768 vs. ML-DSA-65).
  - Evaluates NIST Security Levels (1 to 5), key sizes, ciphertext sizes, and post-quantum readiness.
- **Side-by-Side Code Diff**:
  - Shows exact lines to remove and replacement lines to add.
- **1-Click Actions**:
  - **Download .patch file**: Saves standard git patch files ready to apply via `git apply migration.patch`.
  - **Copy Diff**: Copies code diff directly to clipboard for code reviews.
- **Experiment Benchmarking**:
  - Simulates performance differences (execution speed, memory overhead, and test compatibility).

---

### 6. Threat Watch & Live Crawler (`/watch`)
The continuous threat intelligence monitoring system:
- **Automated 2-Hour Threat Crawler**:
  - Background scheduler continuously queries PyPI vulnerabilities, OSV.dev, and CISA Known Exploited Vulnerabilities (KEV).
- **Manual Trigger**:
  - Includes a "Sync Threat Intelligence Now" button for instant updates.
- **Vulnerability Advisory Database**:
  - Curated database of critical CVEs affecting cryptographic libraries.
- **Cryptographic Drift Detection**:
  - Tracks whether new code commits introduce deprecated algorithms or remove existing security controls.

---

### 7. Dependency Graph Visualizer (`/graph`)
- **Interactive Visual Architecture**:
  - Renders a node-and-edge graph illustrating how cryptographic algorithms connect to application files, services, and databases.
  - Allows security architects to visually trace data paths and pinpoint single points of failure.

---

### 8. Executive Reports (`/reports`)
- **Formal Security Dossier**:
  - Generates comprehensive PDF and Markdown reports summarizing codebase risk, algorithm breakdown, regulatory gap analysis, and estimated migration effort.

---

## 4. Technical Architecture & Resilience

### Backend Architecture
- **Framework**: FastAPI (Python 3.12) with asynchronous routers and background tasks.
- **Dual-Mode Resilient Database Engine**:
  - Connects to remote PostgreSQL (Supabase) if available.
  - If network or DNS is unreachable, it **automatically falls back to local SQLite (`cryptopilot.db`)**, ensuring the app never crashes during offline testing or local evaluation.
- **Automated Seeding**:
  - On startup, automatically seeds a sample enterprise financial project with 6 realistic findings, 3 migration plans, and baseline NIST advisories.
- **CORS Architecture**:
  - Configured with `allow_origin_regex=r"^https?://.*"` and `allow_credentials=True` to support both local development and multi-domain cloud deployments (Render + Vercel).

### Frontend Architecture
- **Framework**: React 18 with TypeScript.
- **Styling**: Tailwind CSS with dark-mode enterprise styling.
- **Build Tool**: Vite (optimized production bundle with 0 TypeScript/ESLint errors).
- **Client Resilience**: Built-in HTTP retry interceptors and automatic fallback token attachment.

---

## 5. How to Run Locally in Under 2 Minutes

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ and npm installed

### Step 1: Start the Backend API
Open a terminal in the project root:
```bash
# Navigate to backend and install dependencies
cd backend
pip install -r requirements.txt

# Start the API server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API will be live at: **http://127.0.0.1:8000**
- Interactive Swagger docs at: **http://127.0.0.1:8000/docs**

### Step 2: Start the Frontend UI
Open a second terminal in the project root:
```bash
# Navigate to frontend and install dependencies
cd frontend
npm install

# Start the Vite development server
npm run dev
```
- Open your browser to: **http://localhost:5173**
- Click **"Explore Live Demo Mode"** to test everything instantly!

---

## 6. How to Deploy to Production (Render & Vercel)

CryptoPilot is pre-configured for one-click cloud deployment:

### Backend Deployment (Render)
1. Push your repository to GitHub.
2. In [Render](https://render.com), click **New Web Service** and select this repository.
3. Settings:
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment Variables:
   - `CORS_ORIGINS`: `*` (or your Vercel URL)
   - *(Optional)* `DATABASE_URL`: Your PostgreSQL connection string.

### Frontend Deployment (Vercel)
1. In [Vercel](https://vercel.com), click **Add New Project** and import this repository.
2. Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Environment Variables:
   - `VITE_API_URL`: Your Render backend URL (e.g., `https://cryptopilot-api.onrender.com`).

---

## 7. Summary for Presentation & Peer Sharing

If you are explaining this project to a friend or professor, here is the 30-second summary:

> *"CryptoPilot is an automated platform that protects software from quantum computing and cryptographic vulnerabilities. It scans code to discover every algorithm in use, generates a Cryptographic Bill of Materials (CBOM), grades compliance against 6 international cybersecurity laws, and produces ready-to-apply code patches to migrate legacy cryptography (like MD5, DES, and RSA) to post-quantum standards (like ML-KEM and AES-256-GCM). It's fully functional, features real-time daily security telemetry, and is ready for production cloud deployment."*
