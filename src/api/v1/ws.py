"""WebSocket endpoint for real-time odds updates and arbitrage alerts."""
import asyncio

import orjson
import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from src.core.redis import get_redis

logger = structlog.get_logger()

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and their channel subscriptions."""

    def __init__(self):
        self.connections: dict[WebSocket, set[str]] = {}

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections[ws] = {"odds:updates", "arb:alerts"}  # Default channels

    def disconnect(self, ws: WebSocket):
        self.connections.pop(ws, None)

    async def broadcast(self, channel: str, message: str):
        """Send message to all connections subscribed to this channel."""
        dead = []
        for ws, channels in self.connections.items():
            if channel in channels:
                try:
                    await ws.send_text(message)
                except Exception:
                    dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    @property
    def count(self) -> int:
        return len(self.connections)


manager = ConnectionManager()


@router.websocket("/ws/odds")
async def websocket_odds(ws: WebSocket):
    """
    WebSocket endpoint for live odds and arb alerts.

    Client can send:
        {"action": "subscribe", "channels": ["odds:updates", "arb:alerts"]}
        {"action": "unsubscribe", "channels": ["odds:updates"]}

    Server pushes:
        {"type": "odds_batch", "platform": "polymarket", "count": 50}
        {"type": "arb_alert", "data": {...}}
        {"type": "heartbeat", "connections": 42}
    """
    await manager.connect(ws)
    logger.info("WebSocket connected", total=manager.count)

    try:
        redis = await get_redis()
        pubsub = redis.pubsub()
        await pubsub.subscribe("odds:updates", "arb:alerts")

        # Run listener and heartbeat concurrently
        listener_task = asyncio.create_task(_redis_listener(pubsub, ws))
        heartbeat_task = asyncio.create_task(_heartbeat(ws))

        try:
            while True:
                # Listen for client messages (subscribe/unsubscribe)
                data = await ws.receive_text()
                try:
                    msg = orjson.loads(data)
                    action = msg.get("action")
                    channels = msg.get("channels", [])

                    if action == "subscribe":
                        manager.connections[ws].update(channels)
                    elif action == "unsubscribe":
                        manager.connections[ws] -= set(channels)
                except (orjson.JSONDecodeError, ValueError):
                    pass

        except WebSocketDisconnect:
            pass
        finally:
            listener_task.cancel()
            heartbeat_task.cancel()
            await pubsub.unsubscribe()

    except Exception as e:
        logger.error("WebSocket error", error=str(e))
    finally:
        manager.disconnect(ws)
        logger.info("WebSocket disconnected", total=manager.count)


async def _redis_listener(pubsub, ws: WebSocket):
    """Forward Redis pub/sub messages to the WebSocket client."""
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("type") == "message":
                channel = message.get("channel", "")
                data = message.get("data", "")
                if isinstance(data, bytes):
                    data = data.decode()

                # Only send if client is subscribed to this channel
                if channel in manager.connections.get(ws, set()):
                    await ws.send_text(data)
            else:
                await asyncio.sleep(0.1)
    except asyncio.CancelledError:
        pass
    except Exception:
        pass


async def _heartbeat(ws: WebSocket):
    """Send heartbeat every 30 seconds."""
    try:
        while True:
            await asyncio.sleep(30)
            await ws.send_text(
                orjson.dumps({"type": "heartbeat", "connections": manager.count}).decode()
            )
    except asyncio.CancelledError:
        pass
    except Exception:
        pass
