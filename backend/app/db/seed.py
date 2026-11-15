"""Seed initial demonstration data for instant evaluation and demo mode."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.db.models.models import (
    User,
    UserSettings,
    Project,
    Scan,
    CryptoFinding,
    RiskAssessment,
    MigrationPlan,
    Advisory,
)
from app.services.monitoring.live_threat_crawler import CURATED_NIST_ADVISORIES


def create_sample_project_for_user(user: User, db: Session) -> Project:
    """Create a complete sample enterprise financial project with findings and migration plans for a user."""
    # Check if this user already has a demo project
    existing = db.query(Project).filter(Project.owner_id == user.id, Project.is_demo == True).first()
    if existing:
        return existing

    project = Project(
        owner_id=user.id,
        name="Enterprise Financial Gateway (Sample)",
        description="Core payment vault, microservices, and token infrastructure evaluated for cryptographic compliance and Post-Quantum readiness.",
        source_type="local_demo",
        source_path="sample-project",
        language="python",
        is_demo=True,
    )
    db.add(project)
    db.flush()

    # Create completed scan
    scan = Scan(
        project_id=project.id,
        status="completed",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        total_findings=6,
        scanner_version="1.0.0",
        metadata_json=json.dumps({
            "progress": 100,
            "step": "Scan completed. Found 6 cryptographic assets across 3 services.",
        }),
    )
    db.add(scan)
    db.flush()

    findings_data = [
        {
            "algorithm": "MD5",
            "operation": "hash",
            "file_path": "src/payments/vault.py",
            "line_number": 42,
            "function_name": "hash_transaction_id",
            "library": "hashlib",
            "detection_method": "call",
            "confidence": 0.98,
            "evidence": "hashlib.md5(transaction_id.encode('utf-8')).hexdigest()",
            "severity": "CRITICAL",
            "quantum_safe": False,
            "nist_status": "broken",
            "recommendation": "Migrate immediately to SHA-256 for data digests or Argon2id / bcrypt for credentials per RFC 6151.",
            "risk_score": 9.2,
            "risk_level": "CRITICAL",
            "explanation": "MD5 suffers from practical collision attacks and rainbow-table precomputations. In breach scenarios, collisions allow signature forgery.",
        },
        {
            "algorithm": "DES",
            "operation": "encrypt",
            "file_path": "src/payments/vault.py",
            "line_number": 15,
            "function_name": "encrypt_card_token",
            "library": "pycryptodome",
            "detection_method": "import",
            "confidence": 0.99,
            "evidence": "from Crypto.Cipher import DES",
            "severity": "CRITICAL",
            "quantum_safe": False,
            "nist_status": "deprecated",
            "recommendation": "Replace obsolete 56-bit DES with AES-256-GCM authenticated encryption per NIST SP 800-131A.",
            "risk_score": 9.5,
            "risk_level": "CRITICAL",
            "explanation": "56-bit key space can be brute-forced in less than 24 hours with commodity computing. Completely forbidden in payment card transactions (PCI-DSS 4.0).",
        },
        {
            "algorithm": "RSA-1024",
            "operation": "sign",
            "file_path": "src/crypto/key_exchange.py",
            "line_number": 18,
            "function_name": "generate_rsa_keypair",
            "library": "pycryptodome",
            "detection_method": "call",
            "confidence": 0.95,
            "evidence": "RSA.generate(1024)",
            "severity": "CRITICAL",
            "quantum_safe": False,
            "nist_status": "deprecated",
            "recommendation": "1024-bit RSA is disallowed by NIST. Transition to RSA-3072 or implement NIST FIPS 204 ML-DSA post-quantum signatures.",
            "risk_score": 9.0,
            "risk_level": "CRITICAL",
            "explanation": "1024-bit modulus is within reach of state-level factorization and is completely defenseless against Shor's quantum algorithm.",
        },
        {
            "algorithm": "SHA1",
            "operation": "hash",
            "file_path": "src/auth/token_service.py",
            "line_number": 28,
            "function_name": "compute_session_etag",
            "library": "hashlib",
            "detection_method": "call",
            "confidence": 0.95,
            "evidence": "hashlib.sha1(session_data).hexdigest()",
            "severity": "HIGH",
            "quantum_safe": False,
            "nist_status": "deprecated",
            "recommendation": "SHA-1 is deprecated by NIST for all cryptographic functions. Replace with SHA-256 or SHA-3-256.",
            "risk_score": 7.8,
            "risk_level": "HIGH",
            "explanation": "Demonstrated chosen-prefix collision attacks invalidate integrity guarantees. NIST SP 800-131A mandates phase-out.",
        },
        {
            "algorithm": "AES-ECB",
            "operation": "encrypt",
            "file_path": "src/payments/vault.py",
            "line_number": 65,
            "function_name": "encrypt_record_block",
            "library": "cryptography",
            "detection_method": "attr",
            "confidence": 0.92,
            "evidence": "modes.ECB()",
            "severity": "HIGH",
            "quantum_safe": False,
            "nist_status": "broken",
            "recommendation": "ECB mode lacks semantic security and preserves plaintext patterns. Migrate immediately to AES-256-GCM.",
            "risk_score": 7.5,
            "risk_level": "HIGH",
            "explanation": "Identical plaintext blocks produce identical ciphertexts. Cryptanalysts can infer data structures and repeated patterns without decrypting.",
        },
        {
            "algorithm": "ECDSA",
            "operation": "sign",
            "file_path": "src/crypto/key_exchange.py",
            "line_number": 84,
            "function_name": "sign_payload_ecdsa",
            "library": "pycryptodome",
            "detection_method": "call",
            "confidence": 0.90,
            "evidence": "DSS.new(key, 'fips-186-3')",
            "severity": "MEDIUM",
            "quantum_safe": False,
            "nist_status": "approved",
            "recommendation": "ECDSA P-256 provides 128-bit classical security, but will be broken by quantum computers. Begin hybrid migration to ML-DSA-65 (FIPS 204).",
            "risk_score": 5.5,
            "risk_level": "MEDIUM",
            "explanation": "Elliptic curve discrete logarithm problem is solvable in polynomial time by Shor's algorithm on a cryptographically relevant quantum computer.",
        },
    ]

    finding_objs = []
    for item in findings_data:
        f = CryptoFinding(
            scan_id=scan.id,
            algorithm=item["algorithm"],
            operation=item["operation"],
            file_path=item["file_path"],
            line_number=item["line_number"],
            function_name=item["function_name"],
            library=item["library"],
            detection_method=item["detection_method"],
            confidence=item["confidence"],
            evidence=item["evidence"],
            severity=item["severity"],
            quantum_safe=item["quantum_safe"],
            nist_status=item["nist_status"],
            recommendation=item["recommendation"],
        )
        db.add(f)
        db.flush()
        finding_objs.append((f, item))

        # Risk assessment
        ra = RiskAssessment(
            scan_id=scan.id,
            finding_id=f.id,
            risk_score=item["risk_score"],
            risk_level=item["risk_level"],
            explanation=item["explanation"],
            factors_json=json.dumps({
                "algorithm_health": "deprecated" if item["nist_status"] != "approved" else "healthy_classical",
                "quantum_exposure": "high" if not item["quantum_safe"] else "none",
                "context_exposure": "critical_flow",
            }),
        )
        db.add(ra)

    # Seed migration plans
    plan1 = MigrationPlan(
        project_id=project.id,
        finding_id=finding_objs[0][0].id,
        title="Migrate MD5 Hashing to SHA-256",
        description="Replace legacy hashlib.md5 call with SHA-256 (NIST FIPS 180-4) to eliminate collision vulnerabilities in financial records.",
        from_algorithm="MD5",
        to_algorithm="SHA-256",
        status="ready",
        priority="CRITICAL",
        effort_estimate="1-2 hours",
        patch_code='''# Migration Diff: MD5 -> SHA-256
- import hashlib
- digest = hashlib.md5(transaction_id.encode('utf-8')).hexdigest()
+ import hashlib
+ digest = hashlib.sha256(transaction_id.encode('utf-8')).hexdigest()''',
    )
    db.add(plan1)

    plan2 = MigrationPlan(
        project_id=project.id,
        finding_id=finding_objs[1][0].id,
        title="Modernize Legacy DES to AES-256-GCM",
        description="Replace 56-bit DES cipher with authenticated AES-256-GCM to meet NIST SP 800-131A Rev. 2 and PCI-DSS 4.0 requirements.",
        from_algorithm="DES",
        to_algorithm="AES-256-GCM",
        status="ready",
        priority="CRITICAL",
        effort_estimate="2-4 hours",
        patch_code='''# Migration Diff: DES -> AES-256-GCM
- from Crypto.Cipher import DES
- cipher = DES.new(key_8byte, DES.MODE_ECB)
+ from cryptography.hazmat.primitives.ciphers.aead import AESGCM
+ aesgcm = AESGCM(key_32byte)
+ ciphertext = aesgcm.encrypt(nonce_12byte, plaintext, None)''',
    )
    db.add(plan2)

    plan3 = MigrationPlan(
        project_id=project.id,
        finding_id=finding_objs[2][0].id,
        title="Post-Quantum Transition: RSA-1024 to ML-KEM-768",
        description="Modernize deprecated 1024-bit asymmetric key exchange to NIST FIPS 203 ML-KEM-768 (Module-Lattice-Based Key-Encapsulation).",
        from_algorithm="RSA-1024",
        to_algorithm="ML-KEM-768 (FIPS 203)",
        status="in_progress",
        priority="CRITICAL",
        effort_estimate="1-2 days",
        patch_code='''# Post-Quantum Transition: ML-KEM-768 Key Encapsulation
# Implements NIST FIPS 203 Post-Quantum Standard
from pqcrypto.kem.kyber768 import generate_keypair, encapsulate, decapsulate

# Client-Server Quantum-Resistant Handshake
public_key, secret_key = generate_keypair()
ciphertext, shared_secret_sender = encapsulate(public_key)
shared_secret_receiver = decapsulate(secret_key, ciphertext)
assert shared_secret_sender == shared_secret_receiver''',
    )
    db.add(plan3)

    db.commit()
    db.refresh(project)
    return project


def delete_sample_project_for_user(user: User, db: Session) -> bool:
    """Delete any sample demo project owned by or accessible to this user."""
    # Delete demo projects owned by user
    sample_projects = db.query(Project).filter(Project.owner_id == user.id, Project.is_demo == True).all()
    if not sample_projects and user.firebase_uid == "demo-enterprise-admin":
        sample_projects = db.query(Project).filter(Project.is_demo == True).all()
        
    for p in sample_projects:
        db.delete(p)
    db.commit()
    return True


def seed_default_data(db: Session) -> None:
    """Idempotently seed demo enterprise data so demo mode works out of the box."""
    try:
        # 1. Seed or get demo user
        demo_user = db.query(User).filter(User.firebase_uid == "demo-enterprise-admin").first()
        if not demo_user:
            demo_user = User(
                firebase_uid="demo-enterprise-admin",
                email="lead.architect@cryptopilot.io",
                display_name="Enterprise Security Lead",
                photo_url="",
                role="chief_cryptographer",
            )
            db.add(demo_user)
            db.flush()
            db.add(UserSettings(user_id=demo_user.id))
            db.commit()
            db.refresh(demo_user)

        # 2. Seed demo project for demo user
        create_sample_project_for_user(demo_user, db)

        # 3. Seed baseline advisories if table is empty
        if db.query(Advisory).count() == 0:
            for item in CURATED_NIST_ADVISORIES:
                db.add(Advisory(
                    source=item.get("source", "NIST"),
                    external_id=item.get("external_id", "NIST-ADV"),
                    title=item.get("title", ""),
                    severity=item.get("severity", "HIGH"),
                    url=item.get("url", ""),
                    summary=item.get("summary", ""),
                    status=item.get("status", "Active"),
                    published_at=str(datetime.now(timezone.utc).date()),
                ))
            db.commit()

    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger("cryptopilot.seed").warning(f"Default data seed notice: {e}")
