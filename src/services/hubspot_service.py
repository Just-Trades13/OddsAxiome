"""HubSpot CRM integration — create and update contacts."""
import httpx
import structlog

from src.core.config import settings

logger = structlog.get_logger()

HUBSPOT_API_BASE = "https://api.hubapi.com"


async def create_hubspot_contact(email: str, name: str | None = None) -> str | None:
    """
    Create a contact in HubSpot. Returns the HubSpot contact ID, or None on failure.
    Uses the HubSpot V3 Contacts API directly via httpx for simplicity.
    """
    if not settings.hubspot_access_token:
        logger.debug("HubSpot not configured, skipping contact creation")
        return None

    properties = {"email": email}
    if name:
        # Split into first/last for HubSpot
        parts = name.strip().split(" ", 1)
        properties["firstname"] = parts[0]
        if len(parts) > 1:
            properties["lastname"] = parts[1]

    properties["lifecyclestage"] = "subscriber"

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                f"{HUBSPOT_API_BASE}/crm/v3/objects/contacts",
                headers={
                    "Authorization": f"Bearer {settings.hubspot_access_token}",
                    "Content-Type": "application/json",
                },
                json={"properties": properties},
            )

            if resp.status_code == 201:
                contact_id = resp.json().get("id")
                logger.info("HubSpot contact created", email=email, contact_id=contact_id)
                return contact_id
            elif resp.status_code == 409:
                # Contact already exists — extract existing ID
                existing_id = resp.json().get("message", "")
                logger.info("HubSpot contact already exists", email=email)
                # Try to get the existing contact
                return await get_hubspot_contact_by_email(email)
            else:
                logger.warning(
                    "HubSpot contact creation failed",
                    status=resp.status_code,
                    body=resp.text[:500],
                )
                return None
        except httpx.RequestError as e:
            logger.error("HubSpot request failed", error=str(e))
            return None


async def get_hubspot_contact_by_email(email: str) -> str | None:
    """Look up a HubSpot contact by email, return the contact ID."""
    if not settings.hubspot_access_token:
        return None

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(
                f"{HUBSPOT_API_BASE}/crm/v3/objects/contacts/search",
                headers={
                    "Authorization": f"Bearer {settings.hubspot_access_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "filterGroups": [
                        {
                            "filters": [
                                {"propertyName": "email", "operator": "EQ", "value": email}
                            ]
                        }
                    ],
                    "limit": 1,
                },
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    return results[0]["id"]
            return None
        except httpx.RequestError:
            return None


async def update_hubspot_contact(contact_id: str, properties: dict) -> bool:
    """Update properties on an existing HubSpot contact."""
    if not settings.hubspot_access_token or not contact_id:
        return False

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.patch(
                f"{HUBSPOT_API_BASE}/crm/v3/objects/contacts/{contact_id}",
                headers={
                    "Authorization": f"Bearer {settings.hubspot_access_token}",
                    "Content-Type": "application/json",
                },
                json={"properties": properties},
            )
            return resp.status_code == 200
        except httpx.RequestError:
            return False
