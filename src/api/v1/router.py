from fastapi import APIRouter

from src.api.v1.admin import router as admin_router
from src.api.v1.affiliates import router as affiliates_router
from src.api.v1.arbitrage import router as arbitrage_router
from src.api.v1.auth import router as auth_router
from src.api.v1.markets import router as markets_router
from src.api.v1.notifications import router as notifications_router
from src.api.v1.odds import router as odds_router
from src.api.v1.subscriptions import router as subscriptions_router
from src.api.v1.users import router as users_router
from src.api.v1.webhooks import router as webhooks_router
from src.api.v1.ws import router as ws_router

v1_router = APIRouter()

v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
v1_router.include_router(users_router, prefix="/users", tags=["users"])
v1_router.include_router(markets_router, prefix="/markets", tags=["markets"])
v1_router.include_router(odds_router, prefix="/odds", tags=["odds"])
v1_router.include_router(arbitrage_router, prefix="/arbitrage", tags=["arbitrage"])
v1_router.include_router(subscriptions_router, prefix="/subscriptions", tags=["subscriptions"])
v1_router.include_router(affiliates_router, prefix="/affiliates", tags=["affiliates"])
v1_router.include_router(webhooks_router, prefix="/webhooks", tags=["webhooks"])
v1_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
v1_router.include_router(admin_router, prefix="/admin", tags=["admin"])
v1_router.include_router(ws_router, tags=["websocket"])
