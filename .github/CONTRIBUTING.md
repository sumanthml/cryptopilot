# Contributing to CryptoPilot

Thank you for your interest in contributing! CryptoPilot is an academic capstone project, but we welcome pull requests, bug reports, and feature suggestions from the community.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Coding Standards](#coding-standards)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Commit Message Convention](#commit-message-convention)

---

## Code of Conduct

Be respectful and constructive. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) v2.1.

---

## Getting Started

### Prerequisites

| Tool       | Minimum Version |
|------------|-----------------|
| Python     | 3.12            |
| Node.js    | 20 LTS          |
| npm        | 10              |
| Git        | 2.40            |
| Docker     | 24 (optional)   |

### Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/CryptoPilot.git
cd CryptoPilot

# 2. Run the setup script (Windows PowerShell)
.\scripts\setup_dev.ps1

# --- OR manual setup ---

# Backend
cd backend
python -m venv .venv
.\.venv\Scripts\activate        # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
copy .env.example .env          # Edit .env with your credentials

# Frontend
cd ../frontend
npm ci
```

### Running Locally

```bash
# Backend (from /backend with venv active)
uvicorn app.main:app --reload --port 8000

# Frontend (from /frontend)
npm run dev
# → http://localhost:5173
```

Or use Docker Compose:

```bash
docker-compose up --build
# Backend → http://localhost:8000
# Frontend → http://localhost:3000
```

---

## Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-awesome-feature
   # or
   git checkout -b fix/scanner-false-positive
   ```

2. **Make your changes** — keep commits focused.

3. **Run tests and linting** (see [Testing](#testing)).

4. **Push and open a Pull Request** against `main`.

---

## Coding Standards

### Python (Backend)

- **Style**: [ruff](https://github.com/astral-sh/ruff) enforces PEP 8 + isort. Run `ruff check .` before committing.
- **Type hints**: All new functions must have full type annotations.
- **Docstrings**: Public functions and classes get a one-line docstring minimum.
- **No secrets in code**: Use environment variables. The `.env` is git-ignored.

### TypeScript / React (Frontend)

- **Strict mode**: `tsconfig.json` enables `strict: true`. No `any` without a comment explaining why.
- **Hooks**: Follow the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks).
- **Components**: Functional components only. Props interfaces must be named `<ComponentName>Props`.
- **Styling**: Tailwind CSS utility classes. Avoid inline `style={}` except for truly dynamic values.

---

## Testing

### Backend

```bash
cd backend
pytest tests/ -v --cov=app --cov-report=term-missing
```

- Minimum coverage target: **60%** (enforced in CI).
- Tests live in `backend/tests/`.
- Use `pytest-asyncio` for async routes/services.
- Mock external APIs (Groq, Gemini, Firebase, OSV) in unit tests.

### Frontend

```bash
cd frontend
npm run lint      # ESLint
npx tsc --noEmit  # Type-check
npm run build     # Build sanity check
```

---

## Pull Request Process

1. **Title**: Follow the commit message convention below.
2. **Description**: Describe *what* changed and *why*. Link related issues with `Closes #123`.
3. **Checklist** (please include in your PR body):
   - [ ] Tests pass locally
   - [ ] No new ruff / ESLint warnings
   - [ ] Documentation updated (if applicable)
   - [ ] No secrets or credentials committed
4. **Review**: At least one approval from a maintainer is required before merge.
5. **Squash merge**: PRs are squash-merged to keep `main` history clean.

---

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer: Closes #issue]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`

**Examples**:
```
feat(scanner): add Go source file support
fix(risk-engine): correct weight normalization for key-size factor
docs(api): document /api/cbom endpoint response schema
ci: add codecov upload step to backend job
```

---

Thank you for helping make CryptoPilot better! 🚀
