from dataclasses import dataclass
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select

from app.core.errors import ErrorDetail
from app.core.time import to_utc_iso, utc_now
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.identity.model import User
from app.modules.system_configuration.errors import system_configuration_conflict, system_configuration_validation
from app.modules.system_configuration.model import SystemConfigurationAudit, SystemConfigurationValue
from app.modules.system_configuration.schemas import (
    SystemConfigurationAdminListResponse,
    SystemConfigurationItemResponse,
    SystemConfigurationPatchEntry,
    SystemConfigurationPatchRequest,
    SystemConfigurationPublicResponse,
    SystemConfigurationValidationMeta,
)


@dataclass(frozen=True)
class ConfigDefinition:
    key: str
    category: str
    type: str
    default: str | bool | int | None
    editable: bool
    visibility: str
    sensitive: bool
    description: str
    min: int | None = None
    max: int | None = None


REGISTRY: dict[str, ConfigDefinition] = {
    "system.registry_version": ConfigDefinition("system.registry_version", "system", "integer", 1, False, "admin_only", False, "Versión del registry de configuración."),
    "business.timezone": ConfigDefinition("business.timezone", "business", "timezone", "America/Argentina/Buenos_Aires", True, "admin_only", False, "Zona horaria operativa del negocio."),
    "store.ordering_enabled": ConfigDefinition("store.ordering_enabled", "store", "boolean", True, True, "admin_only", False, "Permite habilitar o pausar pedidos nuevos."),
    "store.public_name": ConfigDefinition("store.public_name", "store", "string", "Food Store", True, "public", False, "Nombre público del negocio."),
    "store.contact_phone": ConfigDefinition("store.contact_phone", "store", "nullable_string", None, True, "public", False, "Teléfono de contacto público."),
    "store.contact_email": ConfigDefinition("store.contact_email", "store", "nullable_string", None, True, "public", False, "Email de contacto público."),
    "store.address_text": ConfigDefinition("store.address_text", "store", "nullable_string", None, True, "public", False, "Dirección pública del local."),
    "orders.max_items_per_order": ConfigDefinition("orders.max_items_per_order", "orders", "integer", 50, True, "admin_only", False, "Máximo de líneas por pedido.", min=1, max=200),
    "orders.max_quantity_per_item": ConfigDefinition("orders.max_quantity_per_item", "orders", "integer", 20, True, "admin_only", False, "Máxima cantidad por línea.", min=1, max=99),
    "orders.pending_payment_expiration_minutes": ConfigDefinition("orders.pending_payment_expiration_minutes", "orders", "integer", 30, True, "admin_only", False, "Ventana de expiración de pago pendiente.", min=5, max=1440),
}


class SystemConfigurationService:
    async def admin_list(self, uow: SqlAlchemyUnitOfWork) -> SystemConfigurationAdminListResponse:
        async with uow:
            overrides = await self._load_overrides(uow)
            return SystemConfigurationAdminListResponse(items=[self._to_item(defn, overrides.get(defn.key)) for defn in REGISTRY.values()])

    async def public_values(self, uow: SqlAlchemyUnitOfWork) -> SystemConfigurationPublicResponse:
        async with uow:
            overrides = await self._load_overrides(uow)
            values: dict[str, str | bool | int | None] = {}
            for definition in REGISTRY.values():
                if definition.visibility != "public" or definition.sensitive:
                    continue
                values[definition.key] = self._effective_value(definition, overrides.get(definition.key))
            return SystemConfigurationPublicResponse(values=values)

    async def patch(self, uow: SqlAlchemyUnitOfWork, *, payload: SystemConfigurationPatchRequest, current_user: User, request_id: str | None) -> SystemConfigurationAdminListResponse:
        if not payload.updates:
            return await self.admin_list(uow)

        async with uow:
            overrides = await self._load_overrides(uow)
            validation_errors = self._validate_updates(payload.updates)
            if validation_errors:
                raise system_configuration_validation(errors=validation_errors)

            changed_keys: list[str] = []
            for key, update in payload.updates.items():
                definition = REGISTRY[key]
                old_record = overrides.get(key)
                normalized = self._normalize(definition, update.value)

                if old_record and update.expected_version is not None and old_record.version != update.expected_version:
                    raise system_configuration_conflict(key=key)

                old_effective = self._effective_value(definition, old_record)
                if old_effective == normalized:
                    continue

                if old_record is None:
                    old_record = SystemConfigurationValue(key=key, value_json=normalized, version=1, updated_by_user_id=current_user.id)
                    uow.session.add(old_record)
                    overrides[key] = old_record
                else:
                    old_record.value_json = normalized
                    old_record.version += 1
                    old_record.updated_by_user_id = current_user.id

                audit = SystemConfigurationAudit(
                    key=key,
                    old_value_json=old_effective,
                    new_value_json=normalized,
                    changed_by_user_id=current_user.id,
                    changed_at=utc_now(),
                    reason=payload.reason,
                    request_id=request_id,
                )
                uow.session.add(audit)
                changed_keys.append(key)

            if changed_keys:
                await uow.session.flush()

            return SystemConfigurationAdminListResponse(items=[self._to_item(defn, overrides.get(defn.key)) for defn in REGISTRY.values()])

    async def get_effective_map(self, uow: SqlAlchemyUnitOfWork) -> dict[str, str | bool | int | None]:
        async with uow:
            return await self.get_effective_map_in_uow(uow)

    async def get_effective_map_in_uow(self, uow: SqlAlchemyUnitOfWork) -> dict[str, str | bool | int | None]:
        overrides = await self._load_overrides(uow)
        return {key: self._effective_value(defn, overrides.get(key)) for key, defn in REGISTRY.items()}

    async def _load_overrides(self, uow: SqlAlchemyUnitOfWork) -> dict[str, SystemConfigurationValue]:
        result = await uow.session.execute(select(SystemConfigurationValue))
        return {row.key: row for row in result.scalars().all()}

    def _to_item(self, definition: ConfigDefinition, override: SystemConfigurationValue | None) -> SystemConfigurationItemResponse:
        return SystemConfigurationItemResponse(
            key=definition.key,
            category=definition.category,
            type=definition.type,
            editable=definition.editable,
            visibility=definition.visibility,
            sensitive=definition.sensitive,
            description=definition.description,
            default_value=definition.default,
            effective_value=self._effective_value(definition, override),
            is_default_backed=override is None,
            validation=SystemConfigurationValidationMeta(min=definition.min, max=definition.max),
            version=override.version if override else 0,
            updated_at=to_utc_iso(override.updated_at) if override else None,
        )

    def _effective_value(self, definition: ConfigDefinition, override: SystemConfigurationValue | None):
        if override is None:
            return definition.default
        return override.value_json

    def _validate_updates(self, updates: dict[str, SystemConfigurationPatchEntry]) -> list[ErrorDetail]:
        errors: list[ErrorDetail] = []
        for key, entry in updates.items():
            definition = REGISTRY.get(key)
            if definition is None:
                errors.append(ErrorDetail(field=f"body.updates.{key}", message="Unknown configuration key"))
                continue
            if not definition.editable:
                errors.append(ErrorDetail(field=f"body.updates.{key}", message="Read-only key"))
                continue
            try:
                self._normalize(definition, entry.value)
            except ValueError as error:
                errors.append(ErrorDetail(field=f"body.updates.{key}.value", message=str(error)))
        return errors

    def _normalize(self, definition: ConfigDefinition, value: object):
        if definition.type == "boolean":
            if isinstance(value, bool):
                return value
            raise ValueError("Expected boolean value")
        if definition.type == "integer":
            if not isinstance(value, int) or isinstance(value, bool):
                raise ValueError("Expected integer value")
            if definition.min is not None and value < definition.min:
                raise ValueError(f"Must be >= {definition.min}")
            if definition.max is not None and value > definition.max:
                raise ValueError(f"Must be <= {definition.max}")
            return value
        if definition.type == "timezone":
            if not isinstance(value, str) or not value.strip():
                raise ValueError("Expected timezone string")
            try:
                ZoneInfo(value)
            except ZoneInfoNotFoundError as error:
                raise ValueError("Invalid IANA timezone") from error
            return value
        if definition.type == "string":
            if not isinstance(value, str) or not value.strip():
                raise ValueError("Expected non-empty string")
            return value.strip()
        if definition.type == "nullable_string":
            if value is None:
                return None
            if not isinstance(value, str):
                raise ValueError("Expected string or null")
            stripped = value.strip()
            return stripped or None
        raise ValueError("Unsupported type")


system_configuration_service = SystemConfigurationService()
