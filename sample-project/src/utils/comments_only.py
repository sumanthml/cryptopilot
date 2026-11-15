"""Demo/Test Project — Documentation & Comments-Only Module.

This module intentionally mentions cryptographic terms only in comments and strings
so CryptoDiscover can verify LOW confidence vs HIGH confidence AST detections.
"""


def format_compliance_banner() -> str:
    # Note: Historical note referencing RSA-1024 and RC4 sunset policies.
    # No cryptographic primitives are imported or executed in this module.
    return "Compliance target: sunset MD5, SHA1, DES, and legacy RSA-1024 certificates."
