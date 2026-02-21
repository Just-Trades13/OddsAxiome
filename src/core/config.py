from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://oddsaxiom:oddsaxiom@localhost:5432/oddsaxiom"
    database_url_sync: str = "postgresql://oddsaxiom:oddsaxiom@localhost:5432/oddsaxiom"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Firebase
    firebase_project_id: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_explorer_monthly: str = ""
    stripe_price_id_explorer_yearly: str = ""
    stripe_price_id_pro_monthly: str = ""
    stripe_price_id_pro_yearly: str = ""

    # Frontend URL for Stripe redirects
    frontend_url: str = "https://oddsaxiom.com"

    # HubSpot
    hubspot_access_token: str = ""

    # Google AI (Gemini model for market analysis)
    google_ai_api_key: str = ""

    # Data Source API Keys
    kalshi_api_key: str = ""
    kalshi_private_key_path: str = ""
    the_odds_api_key: str = ""
    gemini_api_key: str = ""
    coinbase_api_key: str = ""
    coinbase_api_secret: str = ""
    apify_api_token: str = ""

    # App
    cors_origins: str = "https://oddsaxiom.com,http://localhost:3000"
    secret_key: str = "change-me-in-production"
    environment: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
