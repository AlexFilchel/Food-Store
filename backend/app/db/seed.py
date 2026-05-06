import asyncio

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory, import_models
from app.core.security import hash_password
from app.core.time import utc_now
from app.modules.identity.model import Role, User, UserRole
from app.modules.orders.model import OrderState
from app.modules.payments.model import PaymentMethod

ROLE_SEED = [
    {"id": 1, "code": "ADMIN", "name": "Administrator", "description": "Full system access"},
    {"id": 2, "code": "STOCK", "name": "Stock Manager", "description": "Catalog and stock operations"},
    {"id": 3, "code": "PEDIDOS", "name": "Order Manager", "description": "Order operations"},
    {"id": 4, "code": "CLIENT", "name": "Client", "description": "Customer role"},
]

ORDER_STATE_SEED = [
    {"id": 1, "code": "PENDIENTE", "name": "Pendiente", "description": "Pedido creado", "is_terminal": False, "sort_order": 1},
    {"id": 2, "code": "CONFIRMADO", "name": "Confirmado", "description": "Pago confirmado", "is_terminal": False, "sort_order": 2},
    {"id": 3, "code": "EN_PREPARACION", "name": "En preparación", "description": "Pedido en preparación", "is_terminal": False, "sort_order": 3},
    {"id": 4, "code": "EN_CAMINO", "name": "En camino", "description": "Pedido despachado", "is_terminal": False, "sort_order": 4},
    {"id": 5, "code": "ENTREGADO", "name": "Entregado", "description": "Pedido entregado", "is_terminal": True, "sort_order": 5},
    {"id": 6, "code": "CANCELADO", "name": "Cancelado", "description": "Pedido cancelado", "is_terminal": True, "sort_order": 6},
]

PAYMENT_METHOD_SEED = [
    {"id": 1, "code": "MERCADOPAGO", "name": "Mercado Pago", "description": "Checkout principal", "is_active": True},
    {"id": 2, "code": "EFECTIVO", "name": "Efectivo", "description": "Pago en efectivo", "is_active": True},
    {"id": 3, "code": "TRANSFERENCIA", "name": "Transferencia", "description": "Transferencia bancaria", "is_active": True},
]


async def _upsert_catalog(session, model, rows: list[dict]) -> None:
    for row in rows:
        result = await session.execute(select(model).where(model.id == row["id"]))
        instance = result.scalar_one_or_none()
        if instance is None:
            session.add(model(**row))
            continue
        for key, value in row.items():
            setattr(instance, key, value)
        if hasattr(instance, "updated_at"):
            instance.updated_at = utc_now()
    await session.flush()


async def seed_database() -> None:
    import_models()
    settings = get_settings()
    session_factory = get_session_factory()
    try:
        async with session_factory() as session:
            await _upsert_catalog(session, Role, ROLE_SEED)
            await _upsert_catalog(session, OrderState, ORDER_STATE_SEED)
            await _upsert_catalog(session, PaymentMethod, PAYMENT_METHOD_SEED)

            result = await session.execute(select(User).where(User.email == settings.bootstrap_admin_email))
            admin_user = result.scalar_one_or_none()
            if admin_user is None:
                admin_user = User(
                    first_name=settings.bootstrap_admin_first_name,
                    last_name=settings.bootstrap_admin_last_name,
                    full_name=settings.bootstrap_admin_full_name,
                    email=settings.bootstrap_admin_email,
                    hashed_password=hash_password(settings.bootstrap_admin_password),
                    is_active=True,
                )
                session.add(admin_user)
                await session.flush()
            else:
                admin_user.first_name = settings.bootstrap_admin_first_name
                admin_user.last_name = settings.bootstrap_admin_last_name
                admin_user.full_name = settings.bootstrap_admin_full_name
                admin_user.hashed_password = hash_password(settings.bootstrap_admin_password)
                admin_user.is_active = True
                admin_user.updated_at = utc_now()
                await session.flush()

            admin_role = await session.execute(select(Role).where(Role.code == "ADMIN"))
            role = admin_role.scalar_one()
            assignment = await session.execute(
                select(UserRole).where(UserRole.user_id == admin_user.id, UserRole.role_id == role.id)
            )
            if assignment.scalar_one_or_none() is None:
                session.add(UserRole(user_id=admin_user.id, role_id=role.id))

            await session.commit()
    finally:
        await get_engine().dispose()

    print("Seed completed successfully")


def main() -> None:
    asyncio.run(seed_database())


if __name__ == "__main__":
    main()
