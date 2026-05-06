import hashlib
import secrets
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP
from hmac import compare_digest

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings
from app.core.time import utc_now

PASSWORD_HASH_ROUNDS = 12
PASSWORD_MAX_BYTES = 72


@dataclass(slots=True)
class AccessTokenClaims:
    subject: str
    email: str
    roles: list[str]


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=PASSWORD_HASH_ROUNDS)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        return False


def password_hash_rounds() -> int:
    return PASSWORD_HASH_ROUNDS


def password_exceeds_bcrypt_limit(password: str) -> bool:
    return len(password.encode("utf-8")) > PASSWORD_MAX_BYTES


def create_access_token(*, subject: str, email: str, roles: list[str]) -> str:
    settings = get_settings()
    expires_at = utc_now() + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": subject, "email": email, "roles": roles, "exp": expires_at}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def decode_access_token(token: str) -> AccessTokenClaims:
    settings = get_settings()
    payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
    subject = payload.get("sub")
    email = payload.get("email")
    roles = payload.get("roles")
    if not isinstance(subject, str) or not subject:
        raise JWTError("Missing subject claim")
    if not isinstance(email, str) or not email:
        raise JWTError("Missing email claim")
    if not isinstance(roles, list) or any(not isinstance(role, str) for role in roles):
        raise JWTError("Invalid roles claim")
    return AccessTokenClaims(subject=subject, email=email, roles=roles)


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_refresh_token(token: str, token_hash: str) -> bool:
    return compare_digest(hash_refresh_token(token), token_hash)


def quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
