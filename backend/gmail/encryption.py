from django.conf import settings
from cryptography.fernet import Fernet


def _get_fernet():
    key = settings.GMAIL_TOKEN_ENCRYPTION_KEY
    if not key:
        raise ValueError("GMAIL_TOKEN_ENCRYPTION_KEY not set")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    return _get_fernet().decrypt(encrypted_token.encode()).decode()
