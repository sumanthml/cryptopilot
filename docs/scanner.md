# CryptoDiscover Scanner Architecture & Methodology

CryptoDiscover is the discovery and mapping engine of CryptoPilot. Rather than relying on simple grep or regex searches that result in overwhelming false-positive rates, CryptoDiscover uses **Abstract Syntax Tree (AST)** inspection and semantic analysis to find cryptographic assets.

---

## 1. Scanner Workflow

```
Source Directory (.py files, manifests, configs)
       │
       ▼
1. File Discovery & Boundary Validation (pathlib, size limits)
       │
       ▼
2. Python AST Parsing (ast.parse)
       │
       ├── A. Import Analysis (ast.Import, ast.ImportFrom)
       │      Detects standard & 3rd-party crypto packages (cryptography, pycryptodome, hashlib)
       │
       ├── B. Call Node Inspection (ast.Call, ast.Attribute)
       │      Matches cryptographic calls: AES.new, RSA.generate, hashlib.md5, etc.
       │
       └── C. Keyword & Configuration Scanners
              Inspects YAML/conf files for TLS protocols, cipher suites, JWT algorithms
       │
       ▼
3. Evidence Extraction (ast.get_source_segment)
       Captures exact file, line number, scope, and source line
       │
       ▼
4. Confidence Evaluation (HIGH / MEDIUM / LOW)
       │
       ▼
5. Output Generation (Normalized Finding Dictionaries)
```

---

## 2. Confidence Model

CryptoDiscover explicitly distinguishes between confirmed runtime calls and comments:

| Confidence Level | Detection Method | Description |
| :--- | :--- | :--- |
| **HIGH** | Direct AST Call Node | The code contains an explicit invocation of an algorithm API (e.g., `cipher = AES.new(...)` or `hashlib.sha256(...)`). |
| **MEDIUM** | Manifest / Import | The module imports a cryptographic namespace or defines a package in `requirements.txt` / `pyproject.toml`, but the exact call site is dynamic or passed as a parameter. |
| **LOW** | String / Comment Reference | The algorithm keyword appears inside a comment or docstring (e.g., `comments_only.py`). Flagged as informational to avoid false-positive alert fatigue. |

---

## 3. Supported Cryptographic Primitives & Detection Map

### Hashing & Integrity
- **Broken:** `MD5` (`hashlib.md5`, `Crypto.Hash.MD5`), `SHA-1` (`hashlib.sha1`)
- **Approved Classical:** `SHA-256`, `SHA-384`, `SHA-512`, `BLAKE2b`
- **Post-Quantum / Keccak:** `SHA3-256`, `SHA3-512`

### Symmetric Encryption & AEAD
- **Insecure Modes:** `AES-ECB` (`AES.MODE_ECB`), `DES`, `3DES`, `RC4`, `Blowfish`
- **Standard AEAD:** `AES-256-GCM` (`cryptography.hazmat.primitives.ciphers.aead.AESGCM`), `ChaCha20-Poly1305`

### Asymmetric Cryptography & PQC Targets
- **Legacy Digital Signatures:** `RSA-PKCS1v15` (`padding.PKCS1v15`), `DSA`, `RSA < 2048`
- **Approved Classical:** `RSA-PSS` (`padding.PSS`), `ECDSA` (`ec.SECP256R1`)
- **Post-Quantum Targets (FIPS 203 & 204):** `ML-KEM-768`, `ML-DSA-65`, `Ed25519`
