# CryptoWatch: Threat Intelligence & Crypto-Drift Monitoring

CryptoWatch is the continuous security monitoring subsystem of CryptoPilot. It tracks public vulnerabilities, updates to standards, and detects cryptographic changes across scan revisions.

---

## 1. External Threat Intelligence Feeds

CryptoWatch aggregates from three primary sources with zero cost:

1. **OSV.dev API (Google Open Source Vulnerabilities):**
   - Queries `https://api.osv.dev/v1/query` by ecosystem (`PyPI`) and package name (`cryptography`, `pycryptodome`, `PyJWT`).
   - Retrieves real CVEs, GHSA IDs, severity metrics, and fixed version numbers.
2. **NIST Computer Security Resource Center (CSRC):**
   - Curated tracking of transition notices and post-quantum standards:
     - **FIPS 203:** ML-KEM (Module-Lattice Key Encapsulation)
     - **FIPS 204:** ML-DSA (Module-Lattice Digital Signatures)
     - **FIPS 205:** SLH-DSA (Stateless Hash-Based Signatures)
     - **SP 800-131A Rev. 2:** Transition timeline for legacy key sizes.
3. **PyPI Package Metadata:**
   - Detects when pinned cryptographic packages in `requirements.txt` are deprecated or have critical security updates available.

---

## 2. Crypto-Drift Detection

Crypto-Drift detects differences between **Scan $N-1$** (baseline) and **Scan $N$** (current revision):

- **New Primitives Added:** Flags when a developer commits new cryptographic calls.
- **Primitives Removed:** Tracks remediation when weak algorithms are successfully eliminated.
- **Configuration Changes:** Flags alterations in TLS ciphers or key sizes.

Drift events are committed to the immutable `drift_events` audit table and displayed on the timeline in the CryptoWatch UI.
