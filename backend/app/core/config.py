from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database – Neon PostgreSQL
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    # Risk threshold for alerts
    RISK_ALERT_THRESHOLD: int = 70

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # SendGrid
    SENDGRID_API_KEY: str = ""
    ALERT_FROM_EMAIL: str = ""

    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True


settings = Settings()
