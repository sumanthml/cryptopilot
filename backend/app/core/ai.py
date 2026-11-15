"""Cascading AI: Groq (high-speed key rotation) → Gemini 3.8 → deterministic rule-based fallback."""

from __future__ import annotations

import asyncio
import re
from typing import Any

import httpx

from app.core.config import get_settings

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_PRIMARY_MODEL = "openai/gpt-oss-120b"
GROQ_FALLBACK_MODEL = "qwen/qwen3.8-27b"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent"

_groq_key_index = 0


def _next_groq_key(settings) -> str:
    global _groq_key_index
    keys = [k for k in [settings.GROQ_API_KEY, settings.GROQ_API_KEY2] if k]
    if not keys:
        return ""
    key = keys[_groq_key_index % len(keys)]
    _groq_key_index = (_groq_key_index + 1) % len(keys)
    return key


async def _call_groq_model(model: str, question: str, context: str, settings) -> str | None:
    for attempt in range(2):
        api_key = _next_groq_key(settings)
        if not api_key:
            return None
        messages = [
            {
                "role": "system",
                "content": (
                    "You are the CryptoPilot Cryptographic Security Expert & Quantum Readiness Copilot. "
                    "You provide precise, production-grade technical guidance on cryptographic algorithms, "
                    "post-quantum cryptography (FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH-DSA), "
                    "NIST SP 800-131A Rev. 2 compliance, and exact code refactoring diffs (Python/TypeScript). "
                    "Keep answers structured, authoritative, actionable, and concise.\n"
                    f"{context}" if context else ""
                ),
            },
            {"role": "user", "content": question},
        ]
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": 1200,
            "temperature": 0.2,
        }
        try:
            async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
                resp = await client.post(
                    GROQ_API_URL,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json=payload,
                )
            if resp.status_code == 429 and attempt == 0:
                await asyncio.sleep(1)
                continue
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception:
            continue
    return None


async def _call_gemini(question: str, context: str, settings) -> str | None:
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None
    combined = f"Context:\n{context}\n\nQuestion: {question}" if context else question
    payload = {"contents": [{"parts": [{"text": combined}]}]}
    try:
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            resp = await client.post(
                f"{GEMINI_API_URL}?key={api_key}",
                headers={"Content-Type": "application/json"},
                json=payload,
            )
        if resp.status_code == 200:
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return None
    return None


_RULE_BASED_KB: list[tuple[str, str]] = [
    (r"\bmd5\b", "CRITICAL: MD5 is broken by collision attacks (RFC 6151). Migrate immediately to SHA-256 for digests, or Argon2id / bcrypt for password hashing."),
    (r"\bsha1\b|sha-1", "HIGH: SHA-1 is officially sunset per NIST SP 800-131A. Replace with SHA-256 (NIST FIPS 180-4) or SHA-3-256 (FIPS 202)."),
    (r"\bdes\b|3des|triple.?des", "CRITICAL: DES and 3DES are deprecated by NIST. Migrate to AES-256-GCM authenticated encryption."),
    (r"\brsa\b.*(512|768|1024)", "CRITICAL: RSA key lengths under 2048 bits can be factored. Upgrade to RSA-3072 or transition to ML-DSA (FIPS 204) for quantum resilience."),
    (r"\brsa\b", "RSA is vulnerable to Shor's algorithm on quantum computers. Transition roadmap: RSA-2048/3072 -> hybrid dual-mode -> ML-DSA-65 (FIPS 204)."),
    (r"\becb\b", "CRITICAL: ECB mode leaks structural plaintext patterns. Replace with AES-256-GCM or ChaCha20-Poly1305 AEAD."),
    (r"\brc4\b", "CRITICAL: RC4 stream cipher is broken (RFC 7465). Use AES-256-GCM."),
    (r"\bblowfish\b", "HIGH: Blowfish has 64-bit block size Sweet32 vulnerabilities. Replace with AES-256-GCM."),
    (r"\baes.*(128|192|256)", "AES: Ensure you use AES-GCM with a fresh 96-bit unique nonce per encryption. For post-quantum symmetric security, AES-256 is recommended by NIST."),
    (r"\bpqc\b|post.?quantum", "NIST Post-Quantum Standards: FIPS 203 (ML-KEM) for key exchange; FIPS 204 (ML-DSA) and FIPS 205 (SLH-DSA) for digital signatures."),
]


def _rule_based_answer(question: str, context: str) -> str:
    text = (question + " " + context).lower()
    hits: list[str] = []
    for pattern, advice in _RULE_BASED_KB:
        if re.search(pattern, text, re.IGNORECASE):
            hits.append(advice)
    if hits:
        return "\n\n".join(hits)
    return (
        "CryptoPilot Security Advisory: Validate all cryptographic primitives against NIST SP 800-131A Rev. 2 "
        "and NIST FIPS 203/204/205. Deprecate MD5, SHA-1, DES, and RSA < 2048. Implement AES-256-GCM for authenticated encryption."
    )


async def ask_ai(question: str, context: str = "") -> dict[str, str]:
    """
    Cascading AI call:
    1. Groq (openai/gpt-oss-120b)
    2. Groq fallback (qwen/qwen3.8-27b)
    3. Gemini 3.8
    4. Deterministic expert rule-based knowledge base
    """
    settings = get_settings()

    # Try primary Groq model
    ans = await _call_groq_model(GROQ_PRIMARY_MODEL, question, context, settings)
    if ans:
        return {"answer": ans, "provider": "Groq GPT-120B"}

    # Try secondary Groq model
    ans = await _call_groq_model(GROQ_FALLBACK_MODEL, question, context, settings)
    if ans:
        return {"answer": ans, "provider": "Groq Qwen-27B"}

    # Try Gemini
    ans = await _call_gemini(question, context, settings)
    if ans:
        return {"answer": ans, "provider": "Gemini 3.8"}

    # Rule-based fallback
    ans = _rule_based_answer(question, context)
    return {"answer": ans, "provider": "NIST Expert Engine"}
