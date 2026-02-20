"""Firebase JWT verification for authenticating frontend requests.

Verifies Firebase ID tokens using Google's public certificates.
No service account required — only FIREBASE_PROJECT_ID.
"""
import asyncio
import json
import os
import time
from functools import lru_cache

import httpx
import jwt
from jwt import PyJWKClient
import structlog

from src.core.config import settings

logger = structlog.get_logger()

# Google's public key endpoint for Firebase ID tokens
GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/"

# Cache for Google's public certificates
_cached_certs: dict | None = None
_certs_expiry: float = 0


def _fetch_google_certs() -> dict:
    """Fetch Google's public certificates for verifying Firebase tokens."""
    global _cached_certs, _certs_expiry

    now = time.time()
    if _cached_certs and now < _certs_expiry:
        return _cached_certs

    resp = httpx.get(GOOGLE_CERTS_URL, timeout=10)
    resp.raise_for_status()
    _cached_certs = resp.json()

    # Respect Cache-Control max-age
    cc = resp.headers.get("cache-control", "")
    max_age = 3600  # default 1 hour
    for part in cc.split(","):
        part = part.strip()
        if part.startswith("max-age="):
            try:
                max_age = int(part.split("=")[1])
            except (ValueError, IndexError):
                pass
    _certs_expiry = now + max_age

    logger.debug("Fetched Google public certificates", num_keys=len(_cached_certs))
    return _cached_certs


def _firebase_initialized() -> bool:
    """Check if Firebase project ID is configured."""
    if not settings.firebase_project_id:
        logger.warning("FIREBASE_PROJECT_ID not set — auth will reject all requests")
        return False
    return True


def init_firebase():
    """Validate Firebase config at startup. No Admin SDK needed."""
    if _firebase_initialized():
        logger.info("Firebase auth ready (JWT verification mode)", project_id=settings.firebase_project_id)
    else:
        logger.error("Firebase auth NOT ready — FIREBASE_PROJECT_ID missing")


async def verify_firebase_token(id_token: str) -> dict | None:
    """
    Verify a Firebase ID token and return the decoded claims.
    Returns None if verification fails.

    Uses Google's public certificates to verify the JWT signature
    without needing a service account.
    """
    if not _firebase_initialized():
        return None

    project_id = settings.firebase_project_id
    expected_issuer = FIREBASE_ISSUER_PREFIX + project_id

    loop = asyncio.get_event_loop()
    try:
        # Fetch certs in executor (HTTP call)
        certs = await loop.run_in_executor(None, _fetch_google_certs)

        # Decode header to get the key ID
        unverified_header = jwt.get_unverified_header(id_token)
        kid = unverified_header.get("kid")
        if not kid or kid not in certs:
            logger.warning("Firebase token kid not found in Google certs", kid=kid)
            return None

        # Get the public key for this kid
        cert_pem = certs[kid]

        # Verify and decode the token
        decoded = await loop.run_in_executor(
            None,
            lambda: jwt.decode(
                id_token,
                cert_pem,
                algorithms=["RS256"],
                audience=project_id,
                issuer=expected_issuer,
            ),
        )

        # Additional Firebase-specific checks
        if not decoded.get("sub"):
            logger.warning("Firebase token missing sub claim")
            return None

        # Map to the same format as firebase_admin
        decoded["uid"] = decoded["sub"]

        return decoded

    except jwt.ExpiredSignatureError:
        logger.warning("Firebase token expired")
        return None
    except jwt.InvalidAudienceError:
        logger.warning("Firebase token audience mismatch", expected=project_id)
        return None
    except jwt.InvalidIssuerError:
        logger.warning("Firebase token issuer mismatch", expected=expected_issuer)
        return None
    except jwt.DecodeError as e:
        logger.warning("Firebase token decode error", error=str(e))
        return None
    except Exception as e:
        logger.error("Firebase token verification error", error=str(e))
        return None
