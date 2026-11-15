"""Demo/Test Project — Automated Test Suite for CryptoLab Verification."""

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.auth.token_service import (  # noqa: E402
    compute_legacy_token_fingerprint,
    generate_reset_code,
    generate_signing_keypair,
    sign_auth_payload,
    verify_auth_payload,
)
from src.crypto.key_exchange import (  # noqa: E402
    establish_session_key_ecdh,
    unwrap_session_key_rsa_oaep,
    wrap_session_key_rsa_oaep,
)
from src.crypto.passwords import (  # noqa: E402
    compute_legacy_receipt_sha1,
    derive_legacy_password_hash,
)
from src.payments.vault import (  # noqa: E402
    decrypt_legacy_ecb,
    decrypt_modern_gcm,
    encrypt_legacy_ecb,
    encrypt_modern_gcm,
)


def test_rsa_sign_and_verify():
    priv, pub = generate_signing_keypair()
    payload = b"auth:user=demo-1001"
    sig = sign_auth_payload(priv, payload)
    assert verify_auth_payload(pub, payload, sig) is True
    assert verify_auth_payload(pub, b"tampered", sig) is False


def test_token_fingerprint_deterministic():
    fp1 = compute_legacy_token_fingerprint("demo-session-token")
    fp2 = compute_legacy_token_fingerprint("demo-session-token")
    assert fp1 == fp2
    assert len(fp1) in (32, 64)


def test_reset_code_format():
    code = generate_reset_code(10)
    assert len(code) == 10
    assert code.isalnum()


def test_legacy_ecb_roundtrip():
    key = b"0123456789abcdef"
    ct = encrypt_legacy_ecb(key, b"sensitive-demo-payload")
    assert decrypt_legacy_ecb(key, ct) == b"sensitive-demo-payload"


def test_modern_gcm_roundtrip_and_tamper_rejected():
    key = os.urandom(32)
    ct = encrypt_modern_gcm(key, b"payment-record", aad=b"tenant-demo")
    assert decrypt_modern_gcm(key, ct, aad=b"tenant-demo") == b"payment-record"
    with pytest.raises(Exception):
        decrypt_modern_gcm(key, ct, aad=b"wrong-aad")


def test_ecdh_and_rsa_oaep_key_wrapping():
    session_key = establish_session_key_ecdh()
    assert len(session_key) == 32
    priv, pub = generate_signing_keypair()
    wrapped = wrap_session_key_rsa_oaep(pub, session_key)
    assert unwrap_session_key_rsa_oaep(priv, wrapped) == session_key


def test_password_kdf_and_receipt_digest():
    salt, verifier = derive_legacy_password_hash("demo-passphrase", b"1234567890abcdef")
    assert len(salt) == 16
    assert len(verifier) == 20
    receipt = compute_legacy_receipt_sha1(b"invoice-001")
    assert len(receipt) in (40, 64)
