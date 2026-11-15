"""Deterministic risk scoring engine: 0-100 score with weighted factors."""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Algorithm risk base scores (0-100)
# ---------------------------------------------------------------------------

ALGORITHM_BASE_SCORES: dict[str, float] = {
    # Broken / completely deprecated
    "MD5": 95.0,
    "SHA1": 80.0,
    "DES": 95.0,
    "RC4": 95.0,
    "AES-ECB": 85.0,
    "RSA-1024": 75.0,
    "RSA-512": 95.0,
    "RSA-768": 90.0,
    "3DES": 70.0,
    "Blowfish": 65.0,
    "RSA-PKCS1v15": 55.0,
    # Moderate risk
    "SHA224": 40.0,
    "RSA": 30.0,
    "AES-CBC": 35.0,
    "DSA": 50.0,
    "HMAC-SHA1": 55.0,
    "ECDSA": 20.0,
    "random": 70.0,
    # Low risk
    "AES": 20.0,
    "AES-GCM": 5.0,
    "AES-CCM": 10.0,
    "SHA256": 10.0,
    "SHA384": 5.0,
    "SHA512": 5.0,
    "SHA3-256": 3.0,
    "SHA3-512": 2.0,
    "BLAKE2b": 3.0,
    "BLAKE2s": 3.0,
    "ChaCha20": 5.0,
    "HMAC-SHA256": 10.0,
    "CSPRNG": 5.0,
    "ECC": 10.0,
    "ECDH": 10.0,
    "HMAC": 15.0,
    "RSA-PSS": 15.0,
    "TLS": 10.0,
    "OpenSSL": 10.0,
    "SHA512": 5.0,
}

NIST_STATUS_ADJUSTMENT: dict[str, float] = {
    "broken": 20.0,
    "deprecated": 10.0,
    "approved": -10.0,
    "unknown": 5.0,
}

OPERATION_ADJUSTMENT: dict[str, float] = {
    "hash": 0.0,
    "encrypt": 5.0,
    "sign": 5.0,
    "verify": 0.0,
    "transport": 0.0,
    "mac": -5.0,
    "random": 10.0,
    "derive": -5.0,
}

SEVERITY_THRESHOLDS: list[tuple[float, str]] = [
    (80.0, "CRITICAL"),
    (60.0, "HIGH"),
    (35.0, "MEDIUM"),
    (0.0, "LOW"),
]


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def compute_risk(finding: dict[str, Any]) -> dict[str, Any]:
    """
    Compute a deterministic 0–100 risk score for a crypto finding.

    Parameters
    ----------
    finding : dict
        Must contain at least: algorithm, operation, nist_status, quantum_safe,
        confidence, severity.

    Returns
    -------
    dict with keys: risk_score (float), risk_level (str), explanation (str), factors (dict)
    """
    algorithm: str = finding.get("algorithm", "unknown")
    operation: str = finding.get("operation", "unknown")
    nist_status: str = finding.get("nist_status", "unknown")
    quantum_safe: bool = bool(finding.get("quantum_safe", False))
    confidence: float = float(finding.get("confidence", 0.9))
    severity: str = finding.get("severity", "MEDIUM")

    factors: dict[str, float] = {}

    # 1. Base algorithm risk (weight 50%)
    base = ALGORITHM_BASE_SCORES.get(algorithm, 50.0)
    factors["algorithm_base"] = base
    weighted_base = base * 0.50

    # 2. NIST status adjustment (weight 20%)
    nist_adj = NIST_STATUS_ADJUSTMENT.get(nist_status.lower(), 5.0)
    factors["nist_adjustment"] = nist_adj
    weighted_nist = nist_adj * 0.20

    # 3. Quantum safety penalty (weight 15%)
    quantum_penalty = 0.0 if quantum_safe else 15.0
    factors["quantum_penalty"] = quantum_penalty
    weighted_quantum = quantum_penalty * 1.0  # already 0-15 range, weight built in

    # 4. Operation risk (weight 10%)
    op_adj = OPERATION_ADJUSTMENT.get(operation.lower(), 0.0)
    factors["operation_adjustment"] = op_adj
    weighted_op = op_adj * 0.10 * 10  # scale to contribution

    # 5. Confidence factor (weight 5%) — higher confidence → higher risk certainty
    confidence_factor = confidence * 5.0
    factors["confidence_factor"] = round(confidence_factor, 2)
    weighted_conf = confidence_factor

    # 6. Severity override — if scanner marked CRITICAL, enforce minimum
    severity_minimums = {"CRITICAL": 80.0, "HIGH": 60.0, "MEDIUM": 35.0, "LOW": 0.0}
    severity_min = severity_minimums.get(severity.upper(), 0.0)
    factors["severity_minimum"] = severity_min

    raw_score = weighted_base + weighted_nist + weighted_quantum + weighted_op + weighted_conf
    final_score = _clamp(max(raw_score, severity_min))
    final_score = round(final_score, 2)

    # Determine risk level
    risk_level = "LOW"
    for threshold, level in SEVERITY_THRESHOLDS:
        if final_score >= threshold:
            risk_level = level
            break

    # Build human-readable explanation
    parts: list[str] = [
        f"Algorithm '{algorithm}' has base risk {base:.0f}/100.",
    ]
    if nist_adj > 0:
        parts.append(f"NIST status '{nist_status}' adds {nist_adj:.0f} points.")
    elif nist_adj < 0:
        parts.append(f"NIST status '{nist_status}' reduces risk by {abs(nist_adj):.0f} points.")
    if not quantum_safe:
        parts.append("Not quantum-safe: adds 15 points (quantum computer vulnerability).")
    if final_score > raw_score:
        parts.append(f"Severity '{severity}' enforced minimum of {severity_min:.0f}.")
    parts.append(f"Final risk score: {final_score:.1f}/100 → {risk_level}.")

    return {
        "risk_score": final_score,
        "risk_level": risk_level,
        "explanation": " ".join(parts),
        "factors": {k: round(v, 2) for k, v in factors.items()},
    }
