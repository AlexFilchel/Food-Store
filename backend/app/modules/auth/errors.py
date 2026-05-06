from http import HTTPStatus

from app.core.errors import AppError, ErrorDetail


def auth_email_already_registered() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="AUTH_EMAIL_ALREADY_REGISTERED",
        title="Email Already Registered",
        detail="An account with that email already exists.",
        type_path="auth-email-already-registered",
    )


def auth_invalid_credentials() -> AppError:
    return AppError(
        status_code=HTTPStatus.UNAUTHORIZED,
        code="AUTH_INVALID_CREDENTIALS",
        title="Invalid Credentials",
        detail="Invalid email or password.",
        type_path="auth-invalid-credentials",
    )


def auth_invalid_token() -> AppError:
    return AppError(
        status_code=HTTPStatus.UNAUTHORIZED,
        code="AUTH_INVALID_TOKEN",
        title="Invalid Token",
        detail="The provided authentication token is invalid.",
        type_path="auth-invalid-token",
    )


def auth_token_expired() -> AppError:
    return AppError(
        status_code=HTTPStatus.UNAUTHORIZED,
        code="AUTH_TOKEN_EXPIRED",
        title="Token Expired",
        detail="The provided authentication token has expired.",
        type_path="auth-token-expired",
    )


def auth_refresh_replay_detected() -> AppError:
    return AppError(
        status_code=HTTPStatus.UNAUTHORIZED,
        code="AUTH_REFRESH_REPLAY_DETECTED",
        title="Refresh Replay Detected",
        detail="The provided refresh token has already been used or was revoked.",
        type_path="auth-refresh-replay-detected",
    )


def auth_forbidden() -> AppError:
    return AppError(
        status_code=HTTPStatus.FORBIDDEN,
        code="AUTH_FORBIDDEN",
        title="Forbidden",
        detail="You do not have permission to perform this action.",
        type_path="auth-forbidden",
    )


def auth_rate_limited(*, retry_after_seconds: int) -> AppError:
    return AppError(
        status_code=HTTPStatus.TOO_MANY_REQUESTS,
        code="AUTH_RATE_LIMITED",
        title="Rate Limit Exceeded",
        detail="Too many failed login attempts. Try again later.",
        type_path="auth-rate-limited",
        errors=[ErrorDetail(field="retry_after", message=str(retry_after_seconds))],
    )
