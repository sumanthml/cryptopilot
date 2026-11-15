"""Unit tests for CycloneDX v1.6 CBOM generator."""

import pytest
from app.services.cbom.generator import generate_cbom


def test_generate_cbom_structure():
    sample_findings = [
        {
            "algorithm": "AES-256-GCM",
            "operation": "encryption",
            "library": "cryptography",
            "file_path": "src/payments/vault.py",
            "line_number": 14,
            "severity": "LOW",
            "quantum_safe": False,
            "nist_status": "approved",
        },
        {
            "algorithm": "MD5",
            "operation": "hash",
            "library": "hashlib",
            "file_path": "src/auth/token_service.py",
            "line_number": 32,
            "severity": "CRITICAL",
            "quantum_safe": False,
            "nist_status": "broken",
        },
    ]

    cbom = generate_cbom("PaymentGatewayDemo", sample_findings)

    assert cbom["bomFormat"] == "CycloneDX"
    assert cbom["specVersion"] == "1.6"
    assert "serialNumber" in cbom
    assert "metadata" in cbom
    assert len(cbom["components"]) == 3  # Root app + 2 crypto assets
    assert len(cbom["dependencies"]) >= 1

    crypto_assets = [c for c in cbom["components"] if c["type"] == "cryptographic-asset"]
    assert len(crypto_assets) == 2
    assert any(c["name"] == "AES-256-GCM" for c in crypto_assets)
    assert any(c["name"] == "MD5" for c in crypto_assets)
