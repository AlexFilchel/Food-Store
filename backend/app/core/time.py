from datetime import UTC, datetime


def utc_now() -> datetime:
    return datetime.now(UTC)


def to_utc_iso(value: datetime | None = None) -> str:
    resolved = value or utc_now()
    return resolved.astimezone(UTC).isoformat().replace("+00:00", "Z")
