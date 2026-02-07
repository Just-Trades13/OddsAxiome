"""Firebase JWT verification for authenticating frontend requests."""
import asyncio
from functools import lru_cache

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
import structlog

from src.core.config import settings

logger = structlog.get_logger()

_firebase_app: firebase_admin.App | None = None


def init_firebase() -> firebase_admin.App | None:
    """Initialize Firebase Admin SDK. Call once at startup."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    if not settings.firebase_project_id:
        logger.warning("FIREBASE_PROJECT_ID not set — auth will reject all requests")
        return None

    try:
        # Try default credentials (works in GCP, or with GOOGLE_APPLICATION_CREDENTIALS env var)
        _firebase_app = firebase_admin.initialize_app(
            options={"projectId": settings.firebase_project_id}
        )
        logger.info("Firebase Admin SDK initialized", project_id=settings.firebase_project_id)
        return _firebase_app
    except Exception as e:
        logger.error("Failed to initialize Firebase", error=str(e))
        return None


async def verify_firebase_token(id_token: str) -> dict | None:
    """
    Verify a Firebase ID token and return the decoded claims.
    Returns None if verification fails.

    Firebase's verify_id_token is synchronous, so we run it in executor
    to avoid blocking the async event loop.
    """
    if _firebase_app is None:
        init_firebase()
        if _firebase_app is None:
            return None

    loop = asyncio.get_event_loop()
    try:
        decoded = await loop.run_in_executor(
            None,
            lambda: firebase_auth.verify_id_token(id_token, check_revoked=False),
        )
        return decoded
    except firebase_auth.RevokedIdTokenError:
        logger.warning("Firebase token revoked")
        return None
    except firebase_auth.InvalidIdTokenError as e:
        logger.warning("Invalid Firebase token", error=str(e))
        return None
    except Exception as e:
        logger.error("Firebase token verification error", error=str(e))
        return None
