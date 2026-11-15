# API Reference — CryptoPilot

Base URL (local): `http://localhost:8000`  
Base URL (production): `https://cryptopilot-backend.onrender.com`

Interactive docs: `GET /docs` (Swagger UI) · `GET /redoc` (ReDoc)

All endpoints except `/health` and `/api/auth/firebase-login` require:

```
Authorization: Bearer <Firebase ID token>
```

---

## Health

### `GET /health`
Returns service health. No authentication required.

**Response 200**
```json
{ "status": "ok", "version": "1.0.0" }
```

---

## Authentication

### `POST /api/auth/firebase-login`
Verify a Firebase ID token, upsert the user record, and return the user profile.

**Request body**
```json
{ "id_token": "eyJhbGci..." }
```

**Response 200**
```json
{
  "id": "uuid",
  "firebase_uid": "abc123",
  "email": "user@example.com",
  "display_name": "Alice",
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Errors**: `401 Invalid token`, `422 Validation error`

---

## Projects

### `POST /api/projects`
Create a new project.

**Request body**
```json
{
  "name": "My Backend Service",
  "description": "Payment processing microservice",
  "language": "python"
}
```

**Response 201**
```json
{
  "id": "uuid",
  "name": "My Backend Service",
  "description": "...",
  "language": "python",
  "user_id": "uuid",
  "created_at": "2024-01-01T00:00:00Z",
  "last_scan_at": null,
  "scan_count": 0
}
```

---

### `GET /api/projects`
List all projects for the authenticated user.

**Response 200** — array of project objects (same shape as above)

---

### `GET /api/projects/{project_id}`
Get a single project.

**Response 200** — project object

**Errors**: `404 Not found`

---

### `DELETE /api/projects/{project_id}`
Delete a project and all associated scans, findings, and risk assessments.

**Response 204** No content

---

### `POST /api/projects/{project_id}/scan`
Trigger a new scan. Accepts multipart form data with one or more `.py` files.

**Request** `multipart/form-data`
- `files[]` — one or more Python source files

**Response 202**
```json
{
  "scan_id": "uuid",
  "status": "pending",
  "message": "Scan started"
}
```

The scan runs asynchronously. Poll `GET /api/scans/{scan_id}` for completion.

---

### `POST /api/projects/demo`
Seed the demo project (pre-loaded sample-project findings). No body required.

**Response 201** — project object for the demo project

---

## Scans

### `GET /api/scans/{scan_id}`
Get scan details and status.

**Response 200**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "status": "completed",
  "files_scanned": 5,
  "findings_count": 12,
  "started_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:00:30Z",
  "error_message": null
}
```

**Status values**: `pending` · `running` · `completed` · `failed`

---

### `GET /api/scans/{scan_id}/findings`
Paginated list of findings for a scan.

**Query params**: `page` (default 1), `page_size` (default 20, max 100), `severity` filter

**Response 200**
```json
{
  "items": [ { ...finding... } ],
  "total": 12,
  "page": 1,
  "page_size": 20
}
```

---

## Findings

### `GET /api/findings/{finding_id}`
Get a single crypto finding.

**Response 200**
```json
{
  "id": "uuid",
  "scan_id": "uuid",
  "algorithm": "MD5",
  "operation": "hash",
  "file_path": "src/auth/token_service.py",
  "line_number": 42,
  "function_name": "generate_token",
  "library": "hashlib",
  "detection_method": "ast_import_and_call",
  "confidence": 0.95,
  "evidence": "hashlib.md5(data).hexdigest()",
  "severity": "high",
  "status": "open",
  "risk_score": 78,
  "risk_level": "high"
}
```

---

### `PATCH /api/findings/{finding_id}/status`
Update the remediation status of a finding.

**Request body**
```json
{ "status": "acknowledged" }
```

**Status values**: `open` · `acknowledged` · `in_progress` · `resolved` · `false_positive`

**Response 200** — updated finding object

---

## Risk

### `GET /api/projects/{project_id}/risks`
Aggregated risk summary for a project.

**Response 200**
```json
{
  "project_id": "uuid",
  "overall_risk_score": 72,
  "risk_level": "high",
  "findings_by_severity": { "high": 4, "medium": 6, "low": 2 },
  "top_algorithms": ["MD5", "SHA1", "DES"],
  "findings": [ { ...risk_assessment... } ]
}
```

---

### `POST /api/risk/assess/{finding_id}`
(Re-)run risk assessment for a single finding.

**Response 200**
```json
{
  "finding_id": "uuid",
  "risk_score": 78,
  "risk_level": "high",
  "explanation": "MD5 is cryptographically broken...",
  "factors": {
    "algorithm_safety": { "score": 100, "weight": 0.35, "detail": "MD5 is broken" },
    "nist_pqc_status": { "score": 60, "weight": 0.20, "detail": "SHA-3 available" },
    "key_size": { "score": 0, "weight": 0.15, "detail": "N/A for hash" },
    "protocol_version": { "score": 0, "weight": 0.10, "detail": "N/A" },
    "usage_context": { "score": 80, "weight": 0.10, "detail": "Authentication token hashing" },
    "library_currency": { "score": 10, "weight": 0.10, "detail": "hashlib is current" }
  }
}
```

---

### `GET /api/risk/dashboard/{project_id}`
Full risk dashboard data for the UI.

**Response 200**
```json
{
  "summary": { ...risk summary... },
  "timeline": [ { "date": "2024-01-01", "risk_score": 72 } ],
  "by_algorithm": [ { "algorithm": "MD5", "count": 3, "avg_risk": 78 } ],
  "by_file": [ { "file": "src/auth.py", "finding_count": 2 } ]
}
```

---

## Migrations

### `POST /api/migrations`
Create a migration plan for a finding.

**Request body**
```json
{
  "finding_id": "uuid",
  "target_algorithm": "SHA-256",
  "notes": "Migrate from MD5 to SHA-256 for token generation"
}
```

**Response 201** — migration plan object

---

### `GET /api/migrations/{migration_id}`
Get a migration plan.

**Response 200** — migration plan with status and experiments

---

### `GET /api/projects/{project_id}/migrations`
List all migration plans for a project.

**Response 200** — array of migration plan objects

---

### `POST /api/migrations/{migration_id}/experiment`
Create a migration experiment (code patch to try).

**Request body**
```json
{
  "patch_description": "Replace hashlib.md5 with hashlib.sha256",
  "patch_content": "--- a/src/auth.py\n+++ b/src/auth.py\n..."
}
```

**Response 201** — experiment object

---

### `POST /api/experiments/{experiment_id}/run`
Run the experiment in the isolated lab (async background task).

**Response 202**
```json
{ "experiment_id": "uuid", "status": "running" }
```

---

### `GET /api/experiments/{experiment_id}/results`
Get experiment results.

**Response 200**
```json
{
  "experiment_id": "uuid",
  "status": "completed",
  "tests_passed": 10,
  "tests_failed": 0,
  "test_output": "...",
  "benchmark_baseline_ms": 0.12,
  "benchmark_candidate_ms": 0.11,
  "performance_delta_pct": -8.3,
  "conclusion": "Safe to migrate — all tests pass, 8% faster"
}
```

---

## CryptoWatch

### `GET /api/watch/advisories`
List all stored advisories, optionally filtered by package.

**Query params**: `package` (optional string filter)

**Response 200** — array of advisory objects

---

### `POST /api/watch/fetch`
Trigger a fresh advisory fetch from OSV.dev and PyPI for all packages in the user's projects.

**Response 202**
```json
{ "message": "Advisory fetch started", "packages_queued": 7 }
```

---

### `GET /api/watch/drift/{project_id}`
Get drift events for a project (changes between scan snapshots).

**Response 200**
```json
{
  "project_id": "uuid",
  "drift_events": [
    {
      "id": "uuid",
      "event_type": "new_finding",
      "algorithm": "RC4",
      "file_path": "src/legacy.py",
      "detected_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

---

## CBOM

### `GET /api/cbom/{project_id}`
Generate and return a CycloneDX v1.6 Cryptography Bill of Materials for the project's latest scan.

**Response 200** — CycloneDX v1.6 JSON
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "serialNumber": "urn:uuid:...",
  "version": 1,
  "metadata": { ... },
  "components": [ ... ],
  "cryptoAssets": [ ... ]
}
```

**Headers**: `Content-Type: application/json`, `Content-Disposition: attachment; filename="cbom-{project_id}.json"`

---

## Reports

### `GET /api/reports/{project_id}`
Full structured report for a project (suitable for export).

**Response 200**
```json
{
  "project": { ... },
  "scan": { ... },
  "risk_summary": { ... },
  "findings": [ ... ],
  "migration_plans": [ ... ],
  "advisories": [ ... ],
  "generated_at": "2024-01-01T00:00:00Z"
}
```

---

## AI Assistant

### `POST /api/ai/ask`
Ask the AI assistant a question with optional context.

**Request body**
```json
{
  "question": "What does this MD5 finding mean for my security posture?",
  "context": "Current page: Risk Dashboard. Finding: MD5 hash in token_service.py line 42."
}
```

**Response 200**
```json
{
  "answer": "MD5 is a cryptographically broken hash function...",
  "provider": "groq"
}
```

**Provider values**: `groq` · `gemini` · `rule_based`
