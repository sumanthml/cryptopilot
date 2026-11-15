# CryptoPilot Database Architecture & Schema Specification

CryptoPilot employs a normalized relational schema modeled using **SQLAlchemy 2.0** with native support for both **PostgreSQL (Supabase)** in production and **SQLite** for local development and offline environments.

---

## 1. Relational Entity Diagram

```
[User] (Firebase UID, Credentials, Role)
   │
   ├── [UserSettings] (Theme, AI Preferences, Custom API Keys)
   │
   └── [Project] (Owner ID, Name, Source Path, Demo Flag)
          │
          ├── [Scan] (Project ID, Status, Findings Count, Timestamps)
          │      │
          │      └── [CryptoFinding] (Scan ID, Algorithm, Operation, Library, Location, Evidence)
          │             │
          │             ├── [RiskAssessment] (Finding ID, Score 0-100, Contributing Vectors)
          │             │
          │             └── [MigrationPlan] (Finding ID, Target Primitive, Rationale, Patch)
          │                    │
          │                    └── [MigrationExperiment] (Plan ID, Sandbox Path, Verification Status)
          │                           │
          │                           ├── [TestResult] (Functional, Negative, Regression)
          │                           │
          │                           └── [BenchmarkResult] (Latency, Throughput, Memory)
          │
          ├── [Dependency] (Package Name, Version, Ecosystem)
          │
          ├── [DependencyRelation] (Topology Edges: Algorithm ──> Library ──> File)
          │
          ├── [ProjectAdvisoryMatch] (Matches against OSV/NIST CVEs)
          │
          ├── [DriftEvent] (Scan N vs Scan N-1 Discrepancy Timeline)
          │
          └── [AuditEvent] (Immutable Append-Only Audit Trail)
```

---

## 2. Table Specifications

### `users`
Enforces user authentication, role-based access control, and tenant isolation.
- `id` (INTEGER, Primary Key)
- `firebase_uid` (VARCHAR(128), Unique, Indexed) — Links directly to Firebase Identity
- `email` (VARCHAR(255), Unique)
- `display_name` (VARCHAR(128))
- `role` (VARCHAR(32), Default: 'developer')
- `created_at` (TIMESTAMP WITH TIME ZONE)

### `projects`
Stores registered codebases subjected to cryptographic discovery.
- `id` (INTEGER, Primary Key)
- `owner_id` (INTEGER, Foreign Key: `users.id` ON DELETE CASCADE)
- `name` (VARCHAR(128))
- `description` (TEXT)
- `source_type` (VARCHAR(32)) — `'upload'`, `'local'`, or `'demo'`
- `source_path` (VARCHAR(512))
- `is_demo` (BOOLEAN, Default: FALSE)
- `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

### `scans`
Snapshot of an individual AST discovery execution.
- `id` (INTEGER, Primary Key)
- `project_id` (INTEGER, Foreign Key: `projects.id` ON DELETE CASCADE)
- `status` (VARCHAR(32)) — `'pending'`, `'running'`, `'completed'`, `'failed'`
- `started_at`, `completed_at` (TIMESTAMP WITH TIME ZONE)
- `total_findings` (INTEGER, Default: 0)
- `error_message` (TEXT)

### `crypto_findings`
Traceable evidence of cryptographic primitives identified in the codebase.
- `id` (INTEGER, Primary Key)
- `scan_id` (INTEGER, Foreign Key: `scans.id` ON DELETE CASCADE)
- `algorithm` (VARCHAR(128), Indexed) — e.g., `'AES-128-ECB'`, `'RSA-2048'`, `'MD5'`
- `operation` (VARCHAR(64)) — `'encryption'`, `'signing'`, `'hashing'`, `'key_exchange'`
- `file_path` (VARCHAR(512))
- `line_number` (INTEGER)
- `function_name` (VARCHAR(128))
- `library` (VARCHAR(128)) — e.g., `'cryptography'`, `'pycryptodome'`, `'hashlib'`
- `detection_method` (VARCHAR(64)) — `'AST'`, `'import'`, `'config'`
- `confidence` (VARCHAR(16)) — `'HIGH'`, `'MEDIUM'`, `'LOW'`
- `evidence` (TEXT) — Extracted code snippet
- `severity` (VARCHAR(16)) — `'CRITICAL'`, `'HIGH'`, `'MEDIUM'`, `'LOW'`
- `quantum_safe` (BOOLEAN, Default: FALSE)
- `nist_status` (VARCHAR(64)) — `'approved'`, `'deprecated'`, `'broken'`, `'pqc_candidate'`

### `risk_assessments`
Deterministic, factor-by-factor risk evaluation.
- `id` (INTEGER, Primary Key)
- `scan_id` (INTEGER)
- `finding_id` (INTEGER, Foreign Key: `crypto_findings.id` ON DELETE CASCADE)
- `risk_score` (INTEGER) — Normalized 0 to 100
- `risk_level` (VARCHAR(16)) — `'LOW'`, `'MEDIUM'`, `'HIGH'`, `'CRITICAL'`
- `explanation` (TEXT) — Human-readable audit justification
- `factors_json` (TEXT) — JSON dictionary of contributing risk weights

### `migration_plans`
Engineered replacement strategies.
- `id` (INTEGER, Primary Key)
- `project_id` (INTEGER, Foreign Key: `projects.id` ON DELETE CASCADE)
- `finding_id` (INTEGER, Foreign Key: `crypto_findings.id` ON DELETE SET NULL)
- `title` (VARCHAR(255))
- `from_algorithm` (VARCHAR(128))
- `to_algorithm` (VARCHAR(128))
- `status` (VARCHAR(48)) — `'Planned'`, `'Testing'`, `'Verified'`, `'Rejected'`
- `patch_code` (TEXT) — Synthesized code diff or drop-in replacement

### `migration_experiments` & `test_results`
Execution logs of tests in isolated sandbox environments.
- `id` (INTEGER, Primary Key)
- `migration_plan_id` (INTEGER, Foreign Key: `migration_plans.id`)
- `status` (VARCHAR(32)) — `'created'`, `'running'`, `'passed'`, `'failed'`
- `duration_seconds` (FLOAT)
- `stdout`, `stderr` (TEXT)

---

## 3. Row-Level Data Isolation Policy

All read and write queries enforce `owner_id == authenticated_user.id`. Even if a malicious request attempts to access `/api/projects/999`, the query filter guarantees that users can only interact with codebases and audit evidence they legitimately own.
