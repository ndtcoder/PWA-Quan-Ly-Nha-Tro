from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str = "http://localhost:54321"
    SUPABASE_SERVICE_KEY: str = "your-service-key"
    JWT_SECRET: str = "your-jwt-secret"
    ENVIRONMENT: str = "development"
    GOOGLE_VISION_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_PUBLIC_KEY: str = ""
    VAPID_EMAIL: str = ""
    CASSO_API_KEY: str = ""
    BANK_BIN: str = ""
    BANK_ACCOUNT_NUMBER: str = ""
    BANK_ACCOUNT_NAME: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
