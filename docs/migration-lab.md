# CryptoLab: Migration Experimentation & Verification

CryptoLab provides an **isolated, non-destructive sandbox** for generating, testing, and benchmarking cryptographic replacements before touching production codebases.

---

## 1. Safety Guarantees

- **Zero In-Place Mutation:** The original user project files are **never modified** during automated experimentation.
- **Isolated Workspace:** All tests run inside an ephemeral sandbox directory created via `tempfile.mkdtemp`.
- **Path Sanitization:** Rejects absolute paths and `..` directory traversal attempts.
- **Subprocess Isolation:** Test execution runs with strict timeouts (default: 30 seconds) to prevent infinite loops or denial of service.

---

## 2. The 4-Stage Verification Workflow

```
1. Workspace Provisioning
   Copies relevant files into temporary directory
        │
        ▼
2. Patch Application
   Applies unified diff patch (e.g. AES-ECB ──> AES-256-GCM)
        │
        ▼
3. Multi-Tier Verification Suite
   ├── A. Static Check: py_compile & ast.parse syntax validation
   ├── B. Functional Test: Verifies roundtrip encryption/decryption
   ├── C. Negative Test: Confirms tampered tags/signatures raise exceptions
   └── D. Regression Test: Runs existing project unit tests
        │
        ▼
4. Performance Micro-Benchmarking
   Measures latency, throughput, and CPU execution time (Before vs After)
```

---

## 3. Supported Modernization Refactorings

| Existing Primitive | Recommended Replacement | Operation Category |
| :--- | :--- | :--- |
| `MD5` / `SHA-1` | `SHA-256` / `SHA3-256` | Cryptographic Digest |
| `AES-128-ECB` / `DES3` | `AES-256-GCM` | Authenticated Symmetric Cipher |
| `RSA-2048 (PKCS#1 v1.5)` | `Ed25519` / `ML-DSA-65` | Digital Signatures |
| `ECDH P-256` | `ML-KEM-768` (FIPS 203) | Key Encapsulation / KEM |
| `random.choice` (Tokens) | `secrets` (`os.urandom`) | Cryptographically Secure PRNG |
