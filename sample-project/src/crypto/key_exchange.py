"""Demo/Test Project — Key Establishment & Asymmetric Key Transport.

Demonstrates RSA-OAEP key transport and ECDH P-256 key agreement, both targets
for post-quantum key establishment (e.g., ML-KEM / hybrid X25519+ML-KEM-768) planning.
"""

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa
from cryptography.hazmat.primitives.kdf.hkdf import HKDF


def establish_session_key_ecdh():
    """Derive a 256-bit shared session key using ECDH SECP256R1 + HKDF-SHA256."""
    alice_private = ec.generate_private_key(ec.SECP256R1())
    bob_private = ec.generate_private_key(ec.SECP256R1())

    shared_secret = alice_private.exchange(ec.ECDH(), bob_private.public_key())
    derived_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b"pypay-session-key",
    ).derive(shared_secret)
    return derived_key


def wrap_session_key_rsa_oaep(public_key: rsa.RSAPublicKey, session_key: bytes) -> bytes:
    """Wrap a symmetric session key with RSA-OAEP-SHA256."""
    return public_key.encrypt(
        session_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )


def unwrap_session_key_rsa_oaep(private_key: rsa.RSAPrivateKey, wrapped_key: bytes) -> bytes:
    """Unwrap a symmetric session key with RSA-OAEP-SHA256."""
    return private_key.decrypt(
        wrapped_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )
