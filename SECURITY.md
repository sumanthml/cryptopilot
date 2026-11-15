# Security Policy

## Supported Versions

CryptoPilot is an academic capstone project. Only the current `main` branch receives security fixes.

| Version | Supported |
|---------|-----------|
| `main`  | ✅ Yes    |
| Older releases | ❌ No |

---

## Reporting a Vulnerability

**Please do NOT file a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability in CryptoPilot, please report it responsibly:

1. **Email**: Send details to the project maintainer at the email address listed in the GitHub profile, with the subject line:  
   `[CryptoPilot Security] <brief description>`

2. **Include in your report**:
   - A description of the vulnerability and its potential impact
   - Steps to reproduce (proof-of-concept if possible)
   - Affected component(s): backend, frontend, CI, Docker config, etc.
   - Any suggested mitigations

3. **Response timeline**:
   - Acknowledgment within **48 hours**
   - Initial assessment within **7 days**
   - Fix or public disclosure decision within **30 days**

We appreciate responsible disclosure and will credit reporters in the fix's release notes unless you prefer to remain anonymous.

---

## Security Considerations for Deployers

> [!IMPORTANT]
> CryptoPilot is an **academic project**. Before deploying to production, review and harden the following:

### Credentials & Secrets

- **Never** commit `.env` files or API keys to version control.
- Rotate all API keys (Groq, Gemini, Firebase) regularly.
- Use a strong, randomly generated `CRYPTOPILOT_SECRET_KEY` (minimum 32 bytes of entropy).
- On Render, use `generateValue: true` for the secret key env var.

### Database

- Use Supabase Row-Level Security (RLS) policies to restrict data access per user.
- Rotate the Supabase service-role key; never expose it to the frontend.
- The `DATABASE_URL` contains credentials — treat it as a secret.

### Firebase Authentication

- Restrict Firebase authorized domains to your production domain.
- Enable email enumeration protection in the Firebase console.
- Review Firebase security rules periodically.

### Network

- Deploy the backend behind HTTPS only (Render provides this automatically).
- Set `CRYPTOPILOT_CORS_ORIGINS` to your exact frontend domain — do not use `*`.
- The Docker Compose file binds the backend to `0.0.0.0:8000` for local dev; restrict this in production.

### Uploaded Files / Code Scanning

- CryptoPilot runs `subprocess` calls in the Migration Lab feature inside a temporary directory. Sanitize all file inputs.
- Do not deploy the Migration Lab in a shared/multi-tenant environment without additional sandboxing.

---

## Known Limitations

- The AI assistant sends code context to third-party APIs (Groq / Gemini). Do not submit proprietary or classified code.
- Advisory feeds pull from OSV.dev and PyPI over HTTPS; a network outage falls back to cached/local data.
- This project has not undergone a formal penetration test.
