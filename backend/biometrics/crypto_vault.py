# -*- coding: utf-8 -*-
"""
Biometrics & Cryptographic Vault Module
Provides secure hashing, salting, and verification functions for OTP challenges and clinical authentication.
"""

import hashlib
import hmac
import secrets


def hash_otp(otp: str, salt: str = None):
    """
    Generates a secure PBKDF2-HMAC-SHA256 hash for an OTP code with salt.
    Returns (otp_hash, salt).
    """
    if not salt:
        salt = secrets.token_hex(16)
    
    clean_otp = str(otp or "").strip()
    otp_hash = hashlib.pbkdf2_hmac(
        "sha256",
        clean_otp.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    ).hex()
    return otp_hash, salt


def verify_otp_hash(otp: str, stored_hash: str, salt: str) -> bool:
    """
    Verifies entered OTP against stored PBKDF2 hash using timing-safe comparison.
    Returns True if valid, False otherwise.
    """
    if not otp or not stored_hash or not salt:
        return False
    
    computed_hash, _ = hash_otp(otp, salt=salt)
    return hmac.compare_digest(computed_hash, stored_hash)
