from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore", 
    )

    DATABASE_URL: str
    PLAID_CLIENT_ID: str
    PLAID_CLIENT_SANDBOX_SECRET: str
    PLAID_CLIENT_PROD_SECRET: str
    PLAID_ENV: str = "sandbox"
    TOKEN_ENCRYPTION_KEY: str


settings = Settings()