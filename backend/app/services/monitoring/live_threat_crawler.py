"""Live Threat Intelligence Crawler: crawls OSV.dev, CISA KEV, and NIST standards.
Runs on a periodic 2-hour schedule and supports instant manual sync.
"""

from __future__ import annotations

import asyncio
import datetime
from datetime import timezone
import logging
from typing import Any
import httpx
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models.models import Advisory, CryptoFinding, DriftEvent, Project

logger = logging.getLogger("cryptopilot.threat_crawler")

# Track sync state globally
SYNC_STATE: dict[str, Any] = {
    "status": "idle",
    "last_synced_at": None,
    "next_sync_at": None,
    "total_advisories": 0,
    "last_sync_results": {
        "osv_count": 0,
        "cisa_count": 0,
        "nist_count": 0,
        "new_added": 0,
    },
    "errors": [],
}

# Monitored cryptographic packages across PyPI and npm
MONITORED_PACKAGES = [
    ("cryptography", "PyPI"),
    ("pycryptodome", "PyPI"),
    ("pyOpenSSL", "PyPI"),
    ("paramiko", "PyPI"),
    ("rsa", "PyPI"),
    ("ecdsa", "PyPI"),
    ("bcrypt", "PyPI"),
    ("passlib", "PyPI"),
    ("urllib3", "PyPI"),
    ("crypto-js", "npm"),
    ("node-forge", "npm"),
    ("jsonwebtoken", "npm"),
]

# Baseline authoritative NIST and FIPS cryptographic standards
CURATED_NIST_ADVISORIES = [
    {
        "source": "NIST",
        "external_id": "NIST-SP-800-131A-R2",
        "title": "NIST SP 800-131A Rev 2: Transitioning the Use of Cryptographic Algorithms",
        "severity": "HIGH",
        "url": "https://csrc.nist.gov/pubs/sp/800/131/a/r2/final",
        "summary": "Mandates transition from legacy algorithms. Disallows RSA/DSA keys < 2048 bits and deprecates SHA-1 for digital signatures. Requires minimum 112-bit security strength.",
        "status": "Final Standard",
        "published_at": "2019-03-01",
    },
    {
        "source": "NIST",
        "external_id": "FIPS-203-ML-KEM",
        "title": "FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism (ML-KEM)",
        "severity": "LOW",
        "url": "https://csrc.nist.gov/pubs/fips/203/final",
        "summary": "Primary post-quantum standard for general encryption and key encapsulation. Designed to protect against quantum computer decrypt-and-harvest attacks.",
        "status": "Active FIPS",
        "published_at": "2024-08-13",
    },
    {
        "source": "NIST",
        "external_id": "FIPS-204-ML-DSA",
        "title": "FIPS 204: Module-Lattice-Based Digital Signature Algorithm (ML-DSA)",
        "severity": "LOW",
        "url": "https://csrc.nist.gov/pubs/fips/204/final",
        "summary": "Primary post-quantum standard for digital signatures. Target replacement for RSA-PSS and ECDSA P-256 for long-term authenticity.",
        "status": "Active FIPS",
        "published_at": "2024-08-13",
    },
    {
        "source": "NIST",
        "external_id": "FIPS-205-SLH-DSA",
        "title": "FIPS 205: Stateless Hash-Based Digital Signature Standard (SLH-DSA)",
        "severity": "LOW",
        "url": "https://csrc.nist.gov/pubs/fips/205/final",
        "summary": "Stateless hash-based digital signature standard providing quantum-safe authentication independent of lattice assumptions.",
        "status": "Active FIPS",
        "published_at": "2024-08-13",
    },
]

CRYPTO_KEYWORDS = {
    "crypto", "cipher", "encrypt", "decrypt", "hash", "ssl", "tls",
    "rsa", "aes", "des", "md5", "sha1", "openssl", "certificate",
    "private key", "signature", "nonce", "ecc", "ecdh", "ecdsa"
}


def _is_crypto_related(text: str) -> bool:
    lower = text.lower()
    return any(kw in lower for kw in CRYPTO_KEYWORDS)


def sync_threat_intelligence() -> dict[str, Any]:
    """Execute live crawl across NIST standards, OSV.dev, and CISA KEV."""
    SYNC_STATE["status"] = "crawling"
    errors: list[str] = []
    new_added = 0
    osv_count = 0
    cisa_count = 0
    nist_count = len(CURATED_NIST_ADVISORIES)

    db: Session = SessionLocal()
    try:
        # 1. Sync NIST authoritative standards
        for adv in CURATED_NIST_ADVISORIES:
            exists = db.query(Advisory).filter(Advisory.external_id == adv["external_id"]).first()
            if not exists:
                db.add(Advisory(
                    source=adv["source"],
                    external_id=adv["external_id"],
                    title=adv["title"],
                    severity=adv["severity"],
                    url=adv["url"],
                    summary=adv["summary"],
                    status=adv["status"],
                    published_at=adv["published_at"],
                ))
                new_added += 1
        db.commit()

        # 2. Sync OSV.dev vulnerability database
        with httpx.Client(verify=False, timeout=12.0) as client:
            for pkg_name, eco in MONITORED_PACKAGES:
                try:
                    resp = client.post(
                        "https://api.osv.dev/v1/query",
                        json={"package": {"name": pkg_name, "ecosystem": eco}},
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        vulns = data.get("vulns", [])
                        for v in vulns[:8]:  # Up to 8 latest per package
                            v_id = v.get("id", "")
                            if not v_id:
                                continue
                            osv_count += 1
                            exists = db.query(Advisory).filter(Advisory.external_id == v_id).first()
                            if not exists:
                                summary = v.get("summary") or v.get("details", "")[:500]
                                details_lower = (summary + " " + v.get("details", "")).lower()
                                severity = "HIGH"
                                if "critical" in details_lower or "remote code" in details_lower:
                                    severity = "CRITICAL"
                                elif "low" in details_lower:
                                    severity = "LOW"
                                elif "medium" in details_lower:
                                    severity = "MEDIUM"

                                db.add(Advisory(
                                    source="OSV",
                                    external_id=v_id,
                                    title=summary or f"Vulnerability in {pkg_name} ({v_id})",
                                    severity=severity,
                                    url=f"https://osv.dev/vulnerability/{v_id}",
                                    summary=summary[:600] if summary else f"Security advisory for {pkg_name} package in {eco}.",
                                    status="Active",
                                    published_at=v.get("published", str(datetime.date.today())),
                                ))
                                new_added += 1
                        db.commit()
                except Exception as ex:
                    errors.append(f"OSV crawl error for {pkg_name}: {str(ex)}")

        # 3. Sync CISA Known Exploited Vulnerabilities (KEV) Catalog
        try:
            with httpx.Client(verify=False, timeout=15.0) as client:
                resp = client.get("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json")
                if resp.status_code == 200:
                    cisa_data = resp.json()
                    cisa_vulns = cisa_data.get("vulnerabilities", [])
                    # Filter for cryptographic, SSL, cipher, and TLS CVEs
                    crypto_cisa = [v for v in cisa_vulns if _is_crypto_related(v.get("vulnerabilityName", "") + " " + v.get("shortDescription", ""))]
                    for cv in crypto_cisa[:25]:  # Top 25 crypto KEVs
                        c_id = cv.get("cveID", "")
                        if not c_id:
                            continue
                        cisa_count += 1
                        exists = db.query(Advisory).filter(Advisory.external_id == c_id).first()
                        if not exists:
                            db.add(Advisory(
                                source="CISA-KEV",
                                external_id=c_id,
                                title=f"CISA KEV: {cv.get('vulnerabilityName', c_id)}",
                                severity="CRITICAL",  # All CISA KEV entries are actively exploited
                                url=f"https://nvd.nist.gov/vuln/detail/{c_id}",
                                summary=cv.get("shortDescription", "Actively exploited cryptographic vulnerability cataloged by CISA.")[:600],
                                status="Actively Exploited",
                                published_at=cv.get("dateAdded", str(datetime.date.today())),
                            ))
                            new_added += 1
                    db.commit()
        except Exception as ex:
            errors.append(f"CISA KEV crawl error: {str(ex)}")

        total_advisories = db.query(Advisory).count()

        # Update sync tracking
        now = datetime.datetime.now(timezone.utc)
        SYNC_STATE["status"] = "idle"
        SYNC_STATE["last_synced_at"] = now.isoformat()
        SYNC_STATE["next_sync_at"] = (now + datetime.timedelta(hours=2)).isoformat()
        SYNC_STATE["total_advisories"] = total_advisories
        SYNC_STATE["last_sync_results"] = {
            "osv_count": osv_count,
            "cisa_count": cisa_count,
            "nist_count": nist_count,
            "new_added": new_added,
        }
        SYNC_STATE["errors"] = errors

        return {
            "status": "success",
            "new_advisories_added": new_added,
            "total_advisories": total_advisories,
            "sources": ["NIST Standards", "OSV.dev PyPI/npm", "CISA KEV Catalog"],
            "last_synced_at": SYNC_STATE["last_synced_at"],
            "next_sync_at": SYNC_STATE["next_sync_at"],
            "errors": errors,
        }
    finally:
        db.close()


async def threat_crawler_scheduler_loop():
    """Background task running every 2 hours continuously."""
    logger.info("Starting CryptoPilot 2-Hour Threat Intelligence Crawler Scheduler...")
    # Run initial sync on startup
    try:
        await asyncio.to_thread(sync_threat_intelligence)
        logger.info("Initial threat intelligence crawl completed successfully.")
    except Exception as e:
        logger.error(f"Initial threat intelligence crawl error: {e}")

    TWO_HOURS_SECONDS = 2 * 60 * 60  # 7200 seconds

    while True:
        try:
            await asyncio.sleep(TWO_HOURS_SECONDS)
            logger.info("Triggering scheduled 2-hour threat intelligence crawl...")
            await asyncio.to_thread(sync_threat_intelligence)
            logger.info("Scheduled threat crawl complete.")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in threat crawler scheduled run: {e}")
            await asyncio.sleep(60)  # Brief delay before retrying
