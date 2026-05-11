from collections.abc import Callable

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.database import get_session_factory
from app.modules.auth.repository import RefreshTokenRepository
from app.modules.categories.repository import CategoryRepository
from app.modules.delivery_addresses.repository import DeliveryAddressRepository
from app.modules.identity.repository import RoleRepository, UserRepository, UserRoleRepository
from app.modules.ingredients.repository import AllergenRepository, IngredientAllergenRepository, IngredientRepository
from app.modules.orders.repository import OrderHistoryRepository, OrderItemRepository, OrderRepository, OrderStateRepository
from app.modules.payments.repository import PaymentMethodRepository
from app.modules.products.repository import ProductRepository


class SqlAlchemyUnitOfWork:
    def __init__(self, session_factory: async_sessionmaker[AsyncSession] | None = None) -> None:
        self._session_factory = session_factory or get_session_factory()
        self.session: AsyncSession | None = None

    async def __aenter__(self) -> "SqlAlchemyUnitOfWork":
        self.session = self._session_factory()
        self.refresh_tokens = RefreshTokenRepository(self.session)
        self.categories = CategoryRepository(self.session)
        self.delivery_addresses = DeliveryAddressRepository(self.session)
        self.roles = RoleRepository(self.session)
        self.users = UserRepository(self.session)
        self.user_roles = UserRoleRepository(self.session)
        self.ingredients = IngredientRepository(self.session)
        self.allergens = AllergenRepository(self.session)
        self.ingredient_allergens = IngredientAllergenRepository(self.session)
        self.order_states = OrderStateRepository(self.session)
        self.orders = OrderRepository(self.session)
        self.order_items = OrderItemRepository(self.session)
        self.order_history = OrderHistoryRepository(self.session)
        self.payment_methods = PaymentMethodRepository(self.session)
        self.products = ProductRepository(self.session)
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self.session is None:
            return
        if exc_type is None:
            await self.session.commit()
        else:
            await self.session.rollback()
        await self.session.close()

    async def rollback(self) -> None:
        if self.session is not None:
            await self.session.rollback()


def get_uow() -> SqlAlchemyUnitOfWork:
    return SqlAlchemyUnitOfWork()
