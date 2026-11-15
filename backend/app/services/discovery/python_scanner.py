"""Real AST-based Python crypto scanner."""

from __future__ import annotations

import ast
import os
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Crypto knowledge base
# ---------------------------------------------------------------------------

# Maps import name → (algorithm, operation, library, severity, nist_status, quantum_safe)
CRYPTO_IMPORT_MAP: dict[str, tuple[str, str, str, str, str, bool]] = {
    # hashlib
    "hashlib.md5": ("MD5", "hash", "hashlib", "CRITICAL", "broken", False),
    "hashlib.sha1": ("SHA1", "hash", "hashlib", "HIGH", "deprecated", False),
    "hashlib.sha224": ("SHA224", "hash", "hashlib", "MEDIUM", "approved", False),
    "hashlib.sha256": ("SHA256", "hash", "hashlib", "LOW", "approved", False),
    "hashlib.sha384": ("SHA384", "hash", "hashlib", "LOW", "approved", False),
    "hashlib.sha512": ("SHA512", "hash", "hashlib", "LOW", "approved", False),
    "hashlib.sha3_256": ("SHA3-256", "hash", "hashlib", "LOW", "approved", True),
    "hashlib.sha3_512": ("SHA3-512", "hash", "hashlib", "LOW", "approved", True),
    "hashlib.blake2b": ("BLAKE2b", "hash", "hashlib", "LOW", "approved", True),
    "hashlib.blake2s": ("BLAKE2s", "hash", "hashlib", "LOW", "approved", True),
    # hmac
    "hmac.new": ("HMAC", "mac", "hmac", "LOW", "approved", False),
    # pycryptodome
    "Crypto.Cipher.DES": ("DES", "encrypt", "pycryptodome", "CRITICAL", "deprecated", False),
    "Crypto.Cipher.DES3": ("3DES", "encrypt", "pycryptodome", "HIGH", "deprecated", False),
    "Crypto.Cipher.AES": ("AES", "encrypt", "pycryptodome", "LOW", "approved", False),
    "Crypto.Cipher.ARC4": ("RC4", "encrypt", "pycryptodome", "CRITICAL", "broken", False),
    "Crypto.Cipher.Blowfish": ("Blowfish", "encrypt", "pycryptodome", "HIGH", "deprecated", False),
    "Crypto.Hash.MD5": ("MD5", "hash", "pycryptodome", "CRITICAL", "broken", False),
    "Crypto.Hash.SHA1": ("SHA1", "hash", "pycryptodome", "HIGH", "deprecated", False),
    "Crypto.Hash.SHA256": ("SHA256", "hash", "pycryptodome", "LOW", "approved", False),
    "Crypto.Hash.SHA512": ("SHA512", "hash", "pycryptodome", "LOW", "approved", False),
    "Crypto.PublicKey.RSA": ("RSA", "sign", "pycryptodome", "MEDIUM", "approved", False),
    "Crypto.PublicKey.ECC": ("ECC", "sign", "pycryptodome", "LOW", "approved", True),
    "Crypto.Signature.PKCS1_v1_5": ("RSA-PKCS1v15", "sign", "pycryptodome", "MEDIUM", "deprecated", False),
    "Crypto.Signature.DSS": ("ECDSA", "sign", "pycryptodome", "LOW", "approved", True),
    # cryptography package
    "cryptography.hazmat.primitives.hashes.MD5": ("MD5", "hash", "cryptography", "CRITICAL", "broken", False),
    "cryptography.hazmat.primitives.hashes.SHA1": ("SHA1", "hash", "cryptography", "HIGH", "deprecated", False),
    "cryptography.hazmat.primitives.hashes.SHA256": ("SHA256", "hash", "cryptography", "LOW", "approved", False),
    "cryptography.hazmat.primitives.hashes.SHA512": ("SHA512", "hash", "cryptography", "LOW", "approved", False),
    "cryptography.hazmat.primitives.ciphers.algorithms.AES": ("AES", "encrypt", "cryptography", "LOW", "approved", False),
    "cryptography.hazmat.primitives.ciphers.algorithms.TripleDES": ("3DES", "encrypt", "cryptography", "HIGH", "deprecated", False),
    "cryptography.hazmat.primitives.ciphers.algorithms.Blowfish": ("Blowfish", "encrypt", "cryptography", "HIGH", "deprecated", False),
    "cryptography.hazmat.primitives.ciphers.algorithms.ARC4": ("RC4", "encrypt", "cryptography", "CRITICAL", "broken", False),
    "cryptography.hazmat.primitives.ciphers.modes.ECB": ("AES-ECB", "encrypt", "cryptography", "HIGH", "broken", False),
    "cryptography.hazmat.primitives.asymmetric.rsa": ("RSA", "sign", "cryptography", "MEDIUM", "approved", False),
    "cryptography.hazmat.primitives.asymmetric.ec": ("ECDSA", "sign", "cryptography", "LOW", "approved", True),
    "cryptography.hazmat.primitives.asymmetric.padding.PKCS1v15": ("RSA-PKCS1v15", "sign", "cryptography", "MEDIUM", "deprecated", False),
    # ssl / tls
    "ssl": ("TLS", "transport", "ssl", "LOW", "approved", False),
    "OpenSSL": ("OpenSSL", "transport", "pyOpenSSL", "LOW", "approved", False),
    # random
    "random": ("random", "random", "stdlib", "MEDIUM", "broken", False),
    "os.urandom": ("CSPRNG", "random", "stdlib", "LOW", "approved", True),
    "secrets": ("CSPRNG", "random", "stdlib", "LOW", "approved", True),
}

# Function-call patterns that reveal algorithm choice even without import aliases
FUNCTION_CALL_SIGNATURES: dict[str, tuple[str, str, str, str, str, bool]] = {
    "md5": ("MD5", "hash", "hashlib", "CRITICAL", "broken", False),
    "sha1": ("SHA1", "hash", "hashlib", "HIGH", "deprecated", False),
    "sha256": ("SHA256", "hash", "hashlib", "LOW", "approved", False),
    "sha512": ("SHA512", "hash", "hashlib", "LOW", "approved", False),
}

RECOMMENDATIONS: dict[str, str] = {
    "MD5": "Replace MD5 with SHA-256 (data integrity) or bcrypt/Argon2 (passwords).",
    "SHA1": "Replace SHA-1 with SHA-256 or SHA-3-256.",
    "DES": "Replace DES with AES-256-GCM.",
    "3DES": "Replace 3DES with AES-256-GCM.",
    "RC4": "Replace RC4 with ChaCha20-Poly1305 or AES-256-GCM.",
    "AES-ECB": "Replace ECB mode with AES-GCM or AES-CBC with random IV.",
    "Blowfish": "Replace Blowfish with AES-256-GCM.",
    "RSA-PKCS1v15": "Replace PKCS1v1.5 padding with RSA-PSS or use ECDSA P-256.",
    "RSA-1024": "RSA key too short. Use RSA-2048+ or ECDSA P-256.",
    "random": "Replace random module with secrets or os.urandom for cryptographic purposes.",
}


# ---------------------------------------------------------------------------
# AST visitor
# ---------------------------------------------------------------------------

class _CryptoVisitor(ast.NodeVisitor):
    """Walk an AST collecting cryptographic usages."""

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self.findings: list[dict[str, Any]] = []
        # Track aliases: local name → canonical module path
        self._aliases: dict[str, str] = {}

    def _make_finding(
        self,
        algorithm: str,
        operation: str,
        library: str,
        severity: str,
        nist_status: str,
        quantum_safe: bool,
        line_number: int,
        function_name: str,
        evidence: str,
        detection_method: str,
        confidence: float = 0.9,
    ) -> dict[str, Any]:
        return {
            "algorithm": algorithm,
            "operation": operation,
            "file_path": self.file_path,
            "line_number": line_number,
            "function_name": function_name,
            "library": library,
            "detection_method": detection_method,
            "confidence": confidence,
            "evidence": evidence,
            "severity": severity,
            "quantum_safe": quantum_safe,
            "nist_status": nist_status,
            "recommendation": RECOMMENDATIONS.get(algorithm, f"Review {algorithm} usage against NIST SP 800-131A."),
        }

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            canonical = alias.name
            local = alias.asname or alias.name.split(".")[0]
            self._aliases[local] = canonical
            # Check top-level import
            if canonical in CRYPTO_IMPORT_MAP:
                alg, op, lib, sev, nist, qs = CRYPTO_IMPORT_MAP[canonical]
                self.findings.append(self._make_finding(
                    alg, op, lib, sev, nist, qs,
                    node.lineno, f"import {canonical}",
                    f"import {canonical}", "import", 0.95,
                ))
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        module = node.module or ""
        for alias in node.names:
            full_path = f"{module}.{alias.name}" if module else alias.name
            local = alias.asname or alias.name
            self._aliases[local] = full_path
            if full_path in CRYPTO_IMPORT_MAP:
                alg, op, lib, sev, nist, qs = CRYPTO_IMPORT_MAP[full_path]
                self.findings.append(self._make_finding(
                    alg, op, lib, sev, nist, qs,
                    node.lineno, f"from {module} import {alias.name}",
                    f"from {module} import {alias.name}", "import", 0.97,
                ))
            # Also check the module prefix
            if module in CRYPTO_IMPORT_MAP:
                alg, op, lib, sev, nist, qs = CRYPTO_IMPORT_MAP[module]
                self.findings.append(self._make_finding(
                    alg, op, lib, sev, nist, qs,
                    node.lineno, f"from {module} import ...",
                    f"from {module} import {alias.name}", "import", 0.90,
                ))
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        func_name = self._resolve_call_name(node.func)
        if func_name:
            # Check full dotted name
            if func_name in CRYPTO_IMPORT_MAP:
                alg, op, lib, sev, nist, qs = CRYPTO_IMPORT_MAP[func_name]
                evidence = ast.unparse(node) if hasattr(ast, "unparse") else func_name
                self.findings.append(self._make_finding(
                    alg, op, lib, sev, nist, qs,
                    node.lineno, func_name, evidence[:300], "call", 0.93,
                ))
            # Check simple name
            simple = func_name.split(".")[-1].lower()
            if simple in FUNCTION_CALL_SIGNATURES:
                alg, op, lib, sev, nist, qs = FUNCTION_CALL_SIGNATURES[simple]
                evidence = ast.unparse(node) if hasattr(ast, "unparse") else func_name
                self.findings.append(self._make_finding(
                    alg, op, lib, sev, nist, qs,
                    node.lineno, func_name, evidence[:300], "call", 0.80,
                ))
            # Detect RSA key size issues
            if "RSA" in func_name and node.args:
                try:
                    key_size = ast.literal_eval(node.args[0])
                    if isinstance(key_size, int) and key_size < 2048:
                        evidence = ast.unparse(node) if hasattr(ast, "unparse") else func_name
                        self.findings.append(self._make_finding(
                            "RSA-1024", "sign", "pycryptodome", "HIGH", "deprecated", False,
                            node.lineno, func_name, evidence[:300], "call", 0.95,
                        ))
                except Exception:
                    pass
        self.generic_visit(node)

    def _resolve_call_name(self, node: ast.expr) -> str | None:
        if isinstance(node, ast.Name):
            return self._aliases.get(node.id, node.id)
        if isinstance(node, ast.Attribute):
            value = self._resolve_call_name(node.value)
            if value:
                return f"{value}.{node.attr}"
        return None


# ---------------------------------------------------------------------------
# JavaScript & TypeScript regex patterns
# ---------------------------------------------------------------------------

import re

JS_CRYPTO_PATTERNS = [
    (r"(?:CryptoJS\.MD5|createHash\(['\"]md5['\"]\))", "MD5", "hash", "crypto-js/node:crypto", "CRITICAL", "broken", False, "Migrate to SHA-256 or SHA-3 per RFC 6151."),
    (r"(?:CryptoJS\.SHA1|createHash\(['\"]sha1['\"]\))", "SHA1", "hash", "crypto-js/node:crypto", "HIGH", "deprecated", False, "Sunset by NIST SP 800-131A. Replace with SHA-256."),
    (r"(?:createCipher\(['\"]des['\"]|CryptoJS\.DES)", "DES", "encrypt", "crypto-js/node:crypto", "CRITICAL", "deprecated", False, "DES is insecure; replace with AES-256-GCM."),
    (r"(?:createCipher\(['\"]rc4['\"]|CryptoJS\.RC4)", "RC4", "encrypt", "crypto-js/node:crypto", "CRITICAL", "broken", False, "RC4 stream cipher is broken. Replace with AES-256-GCM."),
    (r"(?:generateKeyPairSync\(['\"]rsa['\"].*?modulusLength:\s*(?:512|1024))", "RSA-1024", "sign", "node:crypto", "CRITICAL", "deprecated", False, "Upgrade to RSA-3072 or ML-DSA (FIPS 204)."),
    (r"(?:createHash\(['\"]sha256['\"]|CryptoJS\.SHA256)", "SHA256", "hash", "crypto-js/node:crypto", "LOW", "approved", False, "Approved by NIST FIPS 180-4."),
    (r"(?:createCipheriv\(['\"]aes-256-gcm['\"])", "AES-256-GCM", "encrypt", "node:crypto", "LOW", "approved", False, "NIST recommended authenticated encryption."),
]


def scan_js_file(file_path: str) -> list[dict[str, Any]]:
    """Scan a JS/TS source file using regex for cryptographic API calls."""
    findings = []
    try:
        lines = Path(file_path).read_text(encoding="utf-8", errors="replace").splitlines()
        for idx, line in enumerate(lines, start=1):
            for pattern, alg, op, lib, sev, nist, qs, rec in JS_CRYPTO_PATTERNS:
                if re.search(pattern, line):
                    findings.append({
                        "algorithm": alg,
                        "operation": op,
                        "file_path": file_path,
                        "line_number": idx,
                        "function_name": f"{lib}.call",
                        "library": lib,
                        "detection_method": "regex",
                        "confidence": 0.88,
                        "evidence": line.strip()[:200],
                        "severity": sev,
                        "quantum_safe": qs,
                        "nist_status": nist,
                        "recommendation": rec,
                    })
    except Exception:
        pass
    return findings


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_file(file_path: str) -> list[dict[str, Any]]:
    """Scan a Python or JavaScript/TypeScript file for cryptographic usages."""
    if file_path.endswith((".js", ".jsx", ".ts", ".tsx", ".mjs")):
        return scan_js_file(file_path)

    try:
        source = Path(file_path).read_text(encoding="utf-8", errors="replace")
        tree = ast.parse(source, filename=file_path)
    except SyntaxError:
        return []
    except Exception:
        return []
    visitor = _CryptoVisitor(file_path)
    visitor.visit(tree)
    return visitor.findings


def scan_directory(directory: str) -> list[dict[str, Any]]:
    """Recursively scan all Python and JavaScript files in a directory for crypto usages."""
    all_findings: list[dict[str, Any]] = []
    if not directory:
        return all_findings

    target_dir = Path(directory)
    if not target_dir.is_dir():
        # Try resolving relative to workspace root
        workspace_root = Path(__file__).resolve().parents[4]
        candidate = workspace_root / directory
        if candidate.is_dir():
            target_dir = candidate
        else:
            return all_findings

    for root, _dirs, files in os.walk(str(target_dir)):
        # Skip common non-code directories
        _dirs[:] = [d for d in _dirs if d not in {".git", "__pycache__", ".venv", "venv", "node_modules", ".tox", "dist", "build"}]
        for fname in files:
            if fname.endswith((".py", ".js", ".jsx", ".ts", ".tsx", ".mjs")):
                full_path = os.path.join(root, fname)
                all_findings.extend(scan_file(full_path))
    return all_findings
