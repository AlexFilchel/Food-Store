from datetime import UTC, datetime


def utc_now() -> datetime:
    return datetime.now(UTC)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def to_utc_iso(value: datetime | None = None) -> str:
    resolved = value or utc_now()
    return ensure_utc(resolved).isoformat().replace("+00:00", "Z")
