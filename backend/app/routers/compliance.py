"""Regulatory compliance audit router: NIST SP 800-131A, CNSA 2.0, OMB M-23-02, PCI-DSS 4.0, EU-CRA."""

from __future__ import annotations

import datetime
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_or_create_user
from app.db.database import get_db
from app.db.models.models import CryptoFinding, Project, RiskAssessment, Scan, User

router = APIRouter()


def _get_user(firebase_uid: str, db: Session) -> User:
    return get_or_create_user(firebase_uid, db)


def _evaluate_frameworks(findings: list[CryptoFinding]) -> list[dict[str, Any]]:
    """Evaluate cryptographic findings against 6 international cybersecurity frameworks."""
    # Find specific algorithm usages
    has_md5 = any("MD5" in f.algorithm for f in findings)
    has_sha1 = any("SHA1" in f.algorithm or "SHA-1" in f.algorithm for f in findings)
    has_des = any("DES" in f.algorithm for f in findings)
    has_ecb = any("ECB" in f.algorithm for f in findings)
    has_rc4 = any("RC4" in f.algorithm for f in findings)
    has_weak_rsa = any("RSA" in f.algorithm and ("1024" in f.algorithm or "512" in f.algorithm or "768" in f.algorithm) for f in findings)
    has_classical_asymmetric = any(f.algorithm in ("RSA", "RSA-2048", "RSA-3072", "RSA-4096", "ECDSA", "ECC", "ECDH", "DSA") for f in findings)
    has_aes_128 = any(f.algorithm in ("AES", "AES-128", "AES-CBC") for f in findings)
    has_quantum_safe = any(f.quantum_safe for f in findings)

    # 1. NIST SP 800-131A Rev. 2
    nist_violations = []
    if has_md5:
        nist_violations.append({
            "rule": "Section 2: Message Digest Algorithms",
            "finding": "MD5 detected",
            "status": "FAIL",
            "impact": "Disallowed. Broken collision resistance. Prohibited for digital signatures and authentication.",
            "remediation": "Transition immediately to SHA-256 (NIST FIPS 180-4) or SHA-3 (FIPS 202).",
        })
    if has_sha1:
        nist_violations.append({
            "rule": "Section 2: Message Digest Algorithms",
            "finding": "SHA-1 detected",
            "status": "FAIL",
            "impact": "Sunset per NIST SP 800-131A Rev. 2. Forbidden for digital signature generation.",
            "remediation": "Replace with SHA-256, SHA-384, or SHA-512.",
        })
    if has_des:
        nist_violations.append({
            "rule": "Section 1: Symmetric Block Ciphers",
            "finding": "DES / 3DES detected",
            "status": "FAIL",
            "impact": "Deprecated. Single-DES is broken; 2-key Triple-DES disallowed due to Sweet32 64-bit block collision attacks.",
            "remediation": "Replace with AES-256-GCM (NIST SP 800-38D).",
        })
    if has_weak_rsa:
        nist_violations.append({
            "rule": "Section 3: Asymmetric Key Sizes",
            "finding": "RSA key length < 2048 bits detected",
            "status": "FAIL",
            "impact": "Disallowed. Minimum security strength must be >= 112 bits (RSA >= 2048 bits).",
            "remediation": "Upgrade to RSA-3072 or transition directly to FIPS 204 ML-DSA.",
        })
    if has_ecb:
        nist_violations.append({
            "rule": "Section 1.2: Modes of Operation",
            "finding": "AES-ECB mode detected",
            "status": "FAIL",
            "impact": "Broken semantic security. Identical plaintext blocks produce identical ciphertexts.",
            "remediation": "Use AES-GCM or AES-CCM authenticated encryption with unique nonces.",
        })

    nist_score = max(10, 100 - len(nist_violations) * 22)
    nist_status = "COMPLIANT" if not nist_violations else ("PARTIAL_COMPLIANCE" if nist_score >= 60 else "NON_COMPLIANT")

    # 2. NSA CNSA 2.0 (National Security Agency Post-Quantum Suite)
    cnsa_violations = []
    if has_classical_asymmetric or has_weak_rsa:
        cnsa_violations.append({
            "rule": "CNSA 2.0 Asymmetric Mandate (Annex A)",
            "finding": "Classical asymmetric cryptography (RSA / ECDSA / ECDH) in use",
            "status": "FAIL",
            "impact": "Completely vulnerable to Shor's algorithm on Cryptographically Relevant Quantum Computers (CRQCs).",
            "remediation": "Mandatory transition to NIST FIPS 203 ML-KEM for key establishment and FIPS 204 ML-DSA for digital signatures.",
        })
    if has_aes_128:
        cnsa_violations.append({
            "rule": "CNSA 2.0 Symmetric Encryption Mandate",
            "finding": "128-bit symmetric encryption in use",
            "status": "WARNING",
            "impact": "Grover's algorithm halves effective symmetric key length to 64 bits, which is insecure for top-secret/national security.",
            "remediation": "Mandatory upgrade to AES-256 (256-bit key ensures 128-bit quantum security strength).",
        })
    if has_md5 or has_sha1:
        cnsa_violations.append({
            "rule": "CNSA 2.0 Hash Digest Mandate",
            "finding": "Legacy hash functions detected",
            "status": "FAIL",
            "impact": "Violates CNSA 2.0 hashing requirements.",
            "remediation": "Mandatory transition to SHA-384 or SHA-512.",
        })

    cnsa_score = 100 if has_quantum_safe and not cnsa_violations else (65 if not has_md5 and not has_des else 25)
    cnsa_status = "COMPLIANT" if cnsa_score >= 85 else ("MIGRATION_REQUIRED" if cnsa_score >= 50 else "CRITICAL_NON_COMPLIANT")

    # 3. White House OMB M-23-02 & M-24-04 (Federal PQC Transition & CBOM)
    omb_violations = []
    if has_md5 or has_des or has_weak_rsa:
        omb_violations.append({
            "rule": "OMB M-23-02 Section 3: High-Risk Cryptographic Asset Inventory",
            "finding": "Critical legacy algorithms detected without active mitigation",
            "status": "FAIL",
            "impact": "Federal agencies and contractors must prioritize remediation of vulnerable cryptographic assets.",
            "remediation": "Create automated Cryptography Bill of Materials (CBOM) and prioritized migration roadmap.",
        })
    if not has_quantum_safe:
        omb_violations.append({
            "rule": "OMB M-23-02 Section 4: Testing & Evaluating PQC Standards",
            "finding": "No post-quantum cryptographic primitives implemented",
            "status": "WARNING",
            "impact": "Requires active pilot implementations and sandbox testing of NIST FIPS 203/204 algorithms.",
            "remediation": "Simulate and verify ML-KEM and ML-DSA in CryptoLab sandbox.",
        })

    omb_score = max(20, 100 - len(omb_violations) * 25)
    omb_status = "COMPLIANT" if not omb_violations else "ACTION_REQUIRED"

    # 4. PCI-DSS v4.0 (Payment Card Industry Data Security Standard)
    pci_violations = []
    if has_md5:
        pci_violations.append({
            "rule": "Requirement 3.4.1: Render PAN unreadable using strong cryptography",
            "finding": "MD5 used in payment/vault data path",
            "status": "FAIL",
            "impact": "Immediate audit failure. MD5 is not acceptable as strong cryptographic hashing.",
            "remediation": "Use salted SHA-256/SHA-3 with HMAC or Argon2id/PBKDF2.",
        })
    if has_des or has_rc4:
        pci_violations.append({
            "rule": "Requirement 3.5: Strong encryption algorithms and key management",
            "finding": "DES or RC4 used for stored cardholder data",
            "status": "FAIL",
            "impact": "Single-DES and RC4 are strictly prohibited under PCI-DSS 4.0.",
            "remediation": "Upgrade to AES-256 in GCM authenticated mode.",
        })
    if has_ecb:
        pci_violations.append({
            "rule": "Requirement 3.5.1: Block cipher modes of operation",
            "finding": "ECB mode used for cardholder records",
            "status": "FAIL",
            "impact": "ECB mode leaks plaintext structural patterns and is forbidden.",
            "remediation": "Switch to authenticated Galois/Counter Mode (GCM).",
        })

    pci_score = max(10, 100 - len(pci_violations) * 30)
    pci_status = "PASSED" if not pci_violations else "NON_COMPLIANT"

    # 5. EU Cyber Resilience Act (CRA 2024/2847)
    cra_violations = []
    if has_md5 or has_des:
        cra_violations.append({
            "rule": "Annex I, Part I (1): Design without known exploitable vulnerabilities",
            "finding": "Obsolete cryptographic algorithms with publicly known collision/factorization exploits",
            "status": "FAIL",
            "impact": "Products with known exploitable vulnerabilities cannot be placed on the EU single market.",
            "remediation": "Update cryptographic libraries and apply automated patches.",
        })
    cra_score = max(25, 100 - len(cra_violations) * 35)
    cra_status = "COMPLIANT" if not cra_violations else "REMEDIATION_MANDATORY"

    # 6. FIPS 140-3 (Cryptographic Module Validation Program)
    fips_violations = []
    if has_md5 or has_des or has_rc4 or has_weak_rsa:
        fips_violations.append({
            "rule": "FIPS 140-3 Section 4.5: Approved Security Functions",
            "finding": "Non-FIPS approved cryptographic algorithms detected in operational code",
            "status": "FAIL",
            "impact": "Module cannot achieve FIPS 140-3 validation status.",
            "remediation": "Operate strictly in FIPS-approved mode with CAVP-validated algorithm implementations.",
        })
    fips_score = max(15, 100 - len(fips_violations) * 40)
    fips_status = "FIPS_APPROVED" if not fips_violations else "NON_FIPS_COMPLIANT"

    return [
        {
            "id": "nist-800-131a",
            "name": "NIST SP 800-131A Rev. 2",
            "title": "Transitioning the Use of Cryptographic Algorithms and Key Lengths",
            "authority": "National Institute of Standards and Technology (USA)",
            "score": nist_score,
            "status": nist_status,
            "mandatory_by": "Immediate (Active Federal Standard)",
            "summary": "Establishes cryptographic transitions, sunsets SHA-1/DES/3DES, and defines minimum 112-bit classical strength.",
            "violations": nist_violations,
        },
        {
            "id": "cnsa-20",
            "name": "NSA CNSA 2.0",
            "title": "Commercial National Security Algorithm Suite 2.0",
            "authority": "National Security Agency (USA)",
            "score": cnsa_score,
            "status": cnsa_status,
            "mandatory_by": "2030 (Transitional) / 2035 (Full Enforcement)",
            "summary": "Mandates quantum-resistant algorithms: ML-KEM-768/1024, ML-DSA-65/87, and AES-256 for all critical infrastructure.",
            "violations": cnsa_violations,
        },
        {
            "id": "omb-m-23-02",
            "name": "White House OMB M-23-02",
            "title": "Migrating to Post-Quantum Cryptography & CBOM Mandate",
            "authority": "Executive Office of the President of the United States",
            "score": omb_score,
            "status": omb_status,
            "mandatory_by": "Active Annual Federal Audit Cycle",
            "summary": "Mandates comprehensive Cryptographic Bill of Materials (CBOM) inventories and prioritized post-quantum transition roadmaps.",
            "violations": omb_violations,
        },
        {
            "id": "pci-dss-40",
            "name": "PCI-DSS v4.0",
            "title": "Payment Card Industry Data Security Standard v4.0",
            "authority": "PCI Security Standards Council (International)",
            "score": pci_score,
            "status": pci_status,
            "mandatory_by": "March 31, 2025 (Strict Global Enforcement)",
            "summary": "Strict requirements 3.4 & 3.5 for PAN data encryption, AEAD cipher suites, and modern key rotation.",
            "violations": pci_violations,
        },
        {
            "id": "eu-cra",
            "name": "EU Cyber Resilience Act",
            "title": "Regulation (EU) 2024/2847 on Digital Product Cybersecurity",
            "authority": "European Parliament & Council of the European Union",
            "score": cra_score,
            "status": cra_status,
            "mandatory_by": "2027 (Enacted 2024)",
            "summary": "Requires digital products placed on EU markets to be designed without known cryptographic flaws and supply complete CBOM/SBOM.",
            "violations": cra_violations,
        },
        {
            "id": "fips-140-3",
            "name": "FIPS 140-3",
            "title": "Security Requirements for Cryptographic Modules",
            "authority": "NIST & Canadian Centre for Cyber Security (CMVP)",
            "score": fips_score,
            "status": fips_status,
            "mandatory_by": "Current CMVP Benchmark",
            "summary": "Defines physical, logical, and algorithmic security boundaries for hardware and software cryptographic modules.",
            "violations": fips_violations,
        },
    ]


@router.get("/compliance/{project_id}")
def get_project_compliance(
    project_id: int,
    firebase_uid: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Run full authoritative regulatory compliance audit across 6 international standards."""
    user = _get_user(firebase_uid, db)
    project = (
        db.query(Project)
        .filter(Project.id == project_id, (Project.owner_id == user.id) | (Project.is_demo == True))
        .first()
    )
    if not project:
        project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    latest_scan = (
        db.query(Scan)
        .filter(Scan.project_id == project_id, Scan.status == "completed")
        .order_by(Scan.started_at.desc())
        .first()
    )

    findings: list[CryptoFinding] = []
    if latest_scan:
        findings = db.query(CryptoFinding).filter(CryptoFinding.scan_id == latest_scan.id).all()
    else:
        findings = (
            db.query(CryptoFinding)
            .join(Scan, CryptoFinding.scan_id == Scan.id)
            .filter(Scan.project_id == project_id)
            .all()
        )

    frameworks = _evaluate_frameworks(findings)

    overall_score = round(sum(f["score"] for f in frameworks) / len(frameworks), 1)
    passed_count = sum(1 for f in frameworks if f["score"] >= 80)

    return {
        "project_id": project_id,
        "project_name": project.name,
        "scan_id": latest_scan.id if latest_scan else None,
        "total_findings_evaluated": len(findings),
        "overall_compliance_score": overall_score,
        "passed_frameworks": f"{passed_count} of {len(frameworks)}",
        "audit_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "frameworks": frameworks,
    }
