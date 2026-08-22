from plaid.api import plaid_api
from plaid.configuration import Configuration
from plaid.api_client import ApiClient
from app.core.config import settings
from cryptography.fernet import Fernet

_HOSTS = {
    "sandbox": "https://sandbox.plaid.com",
    "production": "https://production.plaid.com",
    "development": "https://development.plaid.com",
}

_SECRETS = {
    "sandbox": settings.PLAID_CLIENT_SANDBOX_SECRET,
    "production": settings.PLAID_CLIENT_PROD_SECRET,
    "development": settings.PLAID_CLIENT_PROD_SECRET,
}

_configuration = Configuration(
    host=_HOSTS[settings.PLAID_ENV],
    api_key={
        "clientId": settings.PLAID_CLIENT_ID,
        "secret": _SECRETS[settings.PLAID_ENV],
    },
)

_api_client = ApiClient(_configuration)
plaid_client = plaid_api.PlaidApi(_api_client)

_fernet = Fernet(settings.TOKEN_ENCRYPTION_KEY.encode())

def encrypt_token(token: str) -> str:
    return _fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    return _fernet.decrypt(encrypted.encode()).decode()