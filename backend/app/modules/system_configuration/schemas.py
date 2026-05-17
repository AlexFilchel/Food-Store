from typing import Literal

from pydantic import BaseModel, Field


ConfigType = Literal["string", "nullable_string", "boolean", "integer", "timezone"]
ConfigVisibility = Literal["admin_only", "public"]


class SystemConfigurationValidationMeta(BaseModel):
    min: int | None = None
    max: int | None = None


class SystemConfigurationItemResponse(BaseModel):
    key: str
    category: str
    type: ConfigType
    editable: bool
    visibility: ConfigVisibility
    sensitive: bool
    description: str
    default_value: str | bool | int | None
    effective_value: str | bool | int | None
    is_default_backed: bool
    validation: SystemConfigurationValidationMeta
    version: int
    updated_at: str | None


class SystemConfigurationAdminListResponse(BaseModel):
    items: list[SystemConfigurationItemResponse]


class SystemConfigurationPublicResponse(BaseModel):
    values: dict[str, str | bool | int | None]


class SystemConfigurationPatchEntry(BaseModel):
    value: str | bool | int | None
    expected_version: int | None = Field(default=None, ge=0)


class SystemConfigurationPatchRequest(BaseModel):
    updates: dict[str, SystemConfigurationPatchEntry]
    reason: str | None = Field(default=None, max_length=500)
