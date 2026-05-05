import pytest
from sqlalchemy import func, select

from app.core.database import get_metadata, get_session_factory, import_models
from app.db.seed import seed_database
from app.modules.identity.model import Role, User, UserRole
from app.modules.orders.model import OrderState
from app.modules.payments.model import PaymentMethod


@pytest.mark.asyncio
async def test_seed_is_idempotent():
    import_models()
    session_factory = get_session_factory()
    engine = session_factory.kw["bind"]

    async with engine.begin() as connection:
        await connection.run_sync(get_metadata().create_all)

    await seed_database()
    await seed_database()

    async with session_factory() as session:
        roles_count = await session.scalar(select(func.count()).select_from(Role))
        states_count = await session.scalar(select(func.count()).select_from(OrderState))
        payment_methods_count = await session.scalar(select(func.count()).select_from(PaymentMethod))
        admins_count = await session.scalar(select(func.count()).select_from(User))
        assignments_count = await session.scalar(select(func.count()).select_from(UserRole))

    assert roles_count == 4
    assert states_count == 6
    assert payment_methods_count == 3
    assert admins_count == 1
    assert assignments_count == 1
