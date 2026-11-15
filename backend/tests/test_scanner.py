"""Unit tests for CryptoDiscover Python AST scanner."""

import pytest
import tempfile
from pathlib import Path
from app.services.discovery.python_scanner import scan_directory


def test_scanner_detects_hashlib_md5():
    sample_code = """
import hashlib

def calculate_checksum(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()
"""
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = Path(tmpdir) / "test_hash.py"
        test_file.write_text(sample_code, encoding="utf-8")

        findings = scan_directory(tmpdir)
        algorithms = [f["algorithm"] for f in findings]
        assert "MD5" in algorithms
        md5_f = next(f for f in findings if f["algorithm"] == "MD5")
        assert md5_f["severity"] == "CRITICAL"
        assert md5_f["operation"] == "hash"
        assert md5_f["line_number"] == 5


def test_scanner_detects_aes_ecb_insecure():
    sample_code = """
from Crypto.Cipher import AES

def encrypt_record(key, plaintext):
    cipher = AES.new(key, AES.MODE_ECB)
    return cipher.encrypt(plaintext)
"""
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = Path(tmpdir) / "test_ecb.py"
        test_file.write_text(sample_code, encoding="utf-8")

        findings = scan_directory(tmpdir)
        algorithms = [f["algorithm"] for f in findings]
        assert any("AES" in a for a in algorithms)
        assert any(f["severity"] in ("CRITICAL", "HIGH", "LOW") for f in findings)


def test_scanner_ignores_non_crypto_modules():
    sample_code = """
import math
import os

def calculate_area(radius):
    return math.pi * radius * radius
"""
    with tempfile.TemporaryDirectory() as tmpdir:
        test_file = Path(tmpdir) / "math_utils.py"
        test_file.write_text(sample_code, encoding="utf-8")

        findings = scan_directory(tmpdir)
        assert len(findings) == 0
