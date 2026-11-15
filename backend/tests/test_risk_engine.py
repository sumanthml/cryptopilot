"""Unit tests for deterministic CryptoRisk scoring engine."""

import pytest
from app.services.risk.engine import compute_risk


def test_md5_produces_critical_risk():
    finding = {
        "algorithm": "MD5",
        "operation": "hash",
        "file_path": "src/auth/tokens.py",
        "severity": "CRITICAL",
        "quantum_safe": False,
    }
    result = compute_risk(finding)
    assert result["risk_score"] >= 75
    assert result["risk_level"] == "CRITICAL"
    assert "explanation" in result
    assert "factors" in result


def test_aes_gcm_produces_low_risk():
    finding = {
        "algorithm": "AES-GCM",
        "operation": "encrypt",
        "file_path": "src/storage/vault.py",
        "severity": "LOW",
        "quantum_safe": False,
    }
    result = compute_risk(finding)
    assert result["risk_score"] < 50
    assert result["risk_level"] in ("LOW", "MEDIUM")


def test_public_auth_increases_score_over_test_file():
    finding_auth = {
        "algorithm": "RSA-2048",
        "operation": "sign",
        "file_path": "src/auth/jwt_tokens.py",
        "severity": "MEDIUM",
        "quantum_safe": False,
    }
    finding_test = {
        "algorithm": "RSA-2048",
        "operation": "sign",
        "file_path": "tests/test_mock_keys.py",
        "severity": "MEDIUM",
        "quantum_safe": False,
    }
    score_auth = compute_risk(finding_auth)["risk_score"]
    score_test = compute_risk(finding_test)["risk_score"]
    assert score_auth >= score_test
