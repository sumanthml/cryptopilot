# CryptoPilot Testing Strategy & Quality Assurance

CryptoPilot is accompanied by an extensive test suite covering unit, integration, and security verification.

---

## 1. Test Suite Structure

```
backend/tests/
├── test_scanner.py         # AST parser accuracy, import detection, confidence levels
├── test_risk_engine.py     # Deterministic risk math, weighting, and level mapping
├── test_cbom.py            # CycloneDX v1.6 schema compliance and structure
├── test_drift.py           # Differential scan analysis and event generation
└── test_ai_fallback.py     # Cascading AI: Groq ──> Gemini ──> Deterministic fallback
```

---

## 2. Running Tests Locally

### Backend Unit & Integration Tests (pytest)
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
pytest -v --cov=app --cov-report=term-missing
```

### Frontend Build & Lint Verification
```bash
cd frontend
npm ci
npm run build
npm run lint
```

---

## 3. Automated CI Pipeline (GitHub Actions)

On every pull request and push to `main`, `.github/workflows/ci.yml` executes:
1. **Backend Job:** Installs Python 3.12 dependencies, runs `ruff` linting, and executes the complete `pytest` test suite with coverage enforcement.
2. **Frontend Job:** Installs Node.js 20 dependencies, executes TypeScript compilation (`tsc -b`), and verifies Vite production bundling (`vite build`).
