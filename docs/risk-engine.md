# CryptoRisk Scoring Engine & Prioritization Methodology

CryptoRisk provides an **explainable, deterministic 0–100 risk scoring model** for every detected cryptographic component.

---

## 1. Core Principles

1. **No Black-Box Scores:** Every score is broken down into its contributing factors.
2. **Context-Aware Prioritization:** An insecure algorithm on a public-facing API protecting financial or auth tokens receives a significantly higher score than an algorithm used in a unit test.
3. **Quantum-Horizon Awareness:** Key exchange and encryption mechanisms are penalized for "Harvest Now, Decrypt Later" (HNDL) vulnerability.

---

## 2. Mathematical Formula

The Composite Risk Score $R$ is normalized between $0$ and $100$:

$$R = \min\left(100, \, \sum_{i} W_i \cdot F_i\right)$$

Where each factor $F_i$ represents an evaluated security vector:

| Factor ($F_i$) | Weight ($W_i$) | Evaluation Criteria |
| :--- | :--- | :--- |
| **Algorithm Base Status** | $35\%$ | Based on NIST SP 800-131A & known cryptanalysis. Broken primitives (MD5, DES, ECB) = 95/100; Deprecated (SHA-1, 3DES, RSA-1024) = 75/100; Approved = 5-15/100. |
| **Exposure Vector** | $25\%$ | Network reachability. Public API endpoints / auth tokens = 1.0; Internal services = 0.6; Offline test modules = 0.2. |
| **Data Lifetime / HNDL** | $20\%$ | Retention span of protected data. Encrypted data retained > 5 years is vulnerable to retroactive quantum decryption = 1.0; Ephemeral session tokens = 0.4. |
| **Migration Complexity** | $10\%$ | Drop-in standard replacement (e.g. hashlib.md5 to sha256) = 0.3; Architectural change (KEM integration) = 0.8. |
| **Dependency Depth** | $10\%$ | Number of dependent components in the AST call graph affected by changing this primitive. |

---

## 3. Risk Level Classifications

- **CRITICAL ($75 - 100$):** Broken algorithms or deterministic block ciphers with known active exploits (MD5, DES, AES-ECB). Immediate replacement required.
- **HIGH ($50 - 74$):** Deprecated algorithms or quantum-vulnerable public key exchange/signatures protecting sensitive long-term data (RSA-2048, SHA-1). Migration plan required.
- **MEDIUM ($25 - 49$):** Legacy configurations or non-authenticated encryption modes (AES-CBC without HMAC).
- **LOW ($0 - 24$):** Approved, modern cryptographic implementations (AES-256-GCM, SHA-384, ChaCha20-Poly1305, PQC candidates).
