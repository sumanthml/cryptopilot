"""Demo/Test Project — Password Hashing & File Checksums."""

import hashlib
import os


def derive_legacy_password_hash(password: str, salt: bytes | None = None) -> tuple[bytes, bytes]:
    """Derive password verifier using PBKDF2-HMAC-SHA1 (legacy digest)."""
    if salt is None:
        salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha1", password.encode("utf-8"), salt, 100_000)
    return salt, digest


def compute_legacy_receipt_sha1(data: bytes) -> str:
    """Compute SHA-1 digest for legacy receipt metadata (deprecated hash)."""
    return hashlib.sha1(data).hexdigest()
