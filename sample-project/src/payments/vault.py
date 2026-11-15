"""Demo/Test Project — Payment Vault Encryption Module.

Demonstrates AES-ECB (weak mode), DES3 (deprecated), and AES-256-GCM (modern).
"""

import os
from Crypto.Cipher import AES, DES3
from Crypto.Util.Padding import pad, unpad
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def encrypt_legacy_ecb(key_16: bytes, plaintext: bytes) -> bytes:
    """Encrypt payment metadata using AES-128-ECB (insecure deterministic mode)."""
    cipher = AES.new(key_16, AES.MODE_ECB)
    return cipher.encrypt(pad(plaintext, AES.block_size))


def decrypt_legacy_ecb(key_16: bytes, ciphertext: bytes) -> bytes:
    """Decrypt AES-128-ECB payload."""
    cipher = AES.new(key_16, AES.MODE_ECB)
    return unpad(cipher.decrypt(ciphertext), AES.block_size)


def encrypt_legacy_3des(key_24: bytes, plaintext: bytes) -> bytes:
    """Legacy Triple-DES CBC compatibility wrapper (deprecated cipher)."""
    iv = os.urandom(8)
    cipher = DES3.new(key_24, DES3.MODE_CBC, iv=iv)
    return iv + cipher.encrypt(pad(plaintext, DES3.block_size))


def encrypt_modern_gcm(key_32: bytes, plaintext: bytes, aad: bytes = b"") -> bytes:
    """Encrypt payload with AES-256-GCM authenticated encryption."""
    nonce = os.urandom(12)
    aesgcm = AESGCM(key_32)
    return nonce + aesgcm.encrypt(nonce, plaintext, aad)


def decrypt_modern_gcm(key_32: bytes, payload: bytes, aad: bytes = b"") -> bytes:
    """Decrypt payload with AES-256-GCM authenticated encryption."""
    nonce, ciphertext = payload[:12], payload[12:]
    aesgcm = AESGCM(key_32)
    return aesgcm.decrypt(nonce, ciphertext, aad)
