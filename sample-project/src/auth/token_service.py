"""Demo/Test Project — Authentication and Token Signing Service.

Contains intentional weak & legacy cryptographic patterns for CryptoPilot analysis.
"""

import hashlib
import random
import ssl
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa


def generate_signing_keypair():
    """Generate an RSA-2048 keypair used for authentication token signatures."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def sign_auth_payload(private_key, payload: bytes) -> bytes:
    """Sign authentication payload using RSA-2048 with PKCS1v15 + SHA-256."""
    return private_key.sign(
        payload,
        padding.PKCS1v15(),
        hashes.SHA256(),
    )


def verify_auth_payload(public_key, payload: bytes, signature: bytes) -> bool:
    """Verify RSA signature on authentication payload."""
    try:
        public_key.verify(
            signature,
            payload,
            padding.PKCS1v15(),
            hashes.SHA256(),
        )
        return True
    except Exception:
        return False


def compute_legacy_token_fingerprint(token: str) -> str:
    """Compute MD5 digest for legacy token tracking (weak hash demonstration)."""
    return hashlib.md5(token.encode("utf-8")).hexdigest()


def generate_reset_code(length: int = 8) -> str:
    """Generate password reset token using non-cryptographic PRNG (weak PRNG demo)."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(alphabet) for _ in range(length))


def create_legacy_tls_context() -> ssl.SSLContext:
    """Create TLS context using deprecated minimum protocol version."""
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    context.minimum_version = ssl.TLSVersion.TLSv1
    return context
