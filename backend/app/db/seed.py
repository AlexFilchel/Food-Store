import asyncio
import sys
from decimal import Decimal

from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory, import_models
from app.core.security import hash_password
from app.core.time import utc_now
from app.modules.identity.model import Role, User, UserRole
from app.modules.categories.model import Category
from app.modules.ingredients.model import Ingredient
from app.modules.orders.model import OrderState
from app.modules.payments.model import PaymentMethod, PaymentStatus
from app.modules.products.model import Product, ProductCategory, ProductIngredient

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

PAYMENT_STATUS_SEED = [
    {"id": 1, "code": "PENDING", "name": "Pendiente", "description": "Pago iniciado, esperando confirmación", "is_terminal": False},
    {"id": 2, "code": "APPROVED", "name": "Aprobado", "description": "Pago aprobado y acreditado", "is_terminal": True},
    {"id": 3, "code": "AUTHORIZED", "name": "Autorizado", "description": "Pago autorizado pendiente de captura", "is_terminal": False},
    {"id": 4, "code": "IN_PROCESS", "name": "En proceso", "description": "Pago en proceso de revisión", "is_terminal": False},
    {"id": 5, "code": "IN_MEDIATION", "name": "En mediación", "description": "Pago en mediación", "is_terminal": False},
    {"id": 6, "code": "REJECTED", "name": "Rechazado", "description": "Pago rechazado", "is_terminal": True},
    {"id": 7, "code": "CANCELLED", "name": "Cancelado", "description": "Pago cancelado", "is_terminal": True},
    {"id": 8, "code": "REFUNDED", "name": "Reembolsado", "description": "Pago reembolsado", "is_terminal": True},
    {"id": 9, "code": "CHARGED_BACK", "name": "Contracargo", "description": "Pago con contracargo", "is_terminal": True},
    {"id": 10, "code": "FAILED", "name": "Fallido", "description": "Pago fallido por error técnico", "is_terminal": True},
]

CATEGORY_SEED = [
    {"id": 1, "name": "Pizzas", "slug": "pizzas", "description": "Pizzas clásicas y especiales", "parent_id": None, "sort_order": 1, "is_active": True},
    {"id": 2, "name": "Empanadas", "slug": "empanadas", "description": "Empanadas horneadas y fritas", "parent_id": None, "sort_order": 2, "is_active": True},
    {"id": 3, "name": "Hamburguesas", "slug": "hamburguesas", "description": "Burgers artesanales", "parent_id": None, "sort_order": 3, "is_active": True},
    {"id": 4, "name": "Bebidas", "slug": "bebidas", "description": "Bebidas frías y calientes", "parent_id": None, "sort_order": 4, "is_active": True},
    {"id": 5, "name": "Postres", "slug": "postres", "description": "Opciones dulces", "parent_id": None, "sort_order": 5, "is_active": True},
    {"id": 6, "name": "Pizza a la piedra", "slug": "pizza-a-la-piedra", "description": "Masa fina crocante", "parent_id": 1, "sort_order": 6, "is_active": True},
    {"id": 7, "name": "Pizza rellena", "slug": "pizza-rellena", "description": "Pizzas con borde relleno", "parent_id": 1, "sort_order": 7, "is_active": True},
    {"id": 8, "name": "Empanadas clásicas", "slug": "empanadas-clasicas", "description": "Sabores tradicionales", "parent_id": 2, "sort_order": 8, "is_active": True},
    {"id": 9, "name": "Empanadas premium", "slug": "empanadas-premium", "description": "Sabores gourmet", "parent_id": 2, "sort_order": 9, "is_active": True},
    {"id": 10, "name": "Smash burgers", "slug": "smash-burgers", "description": "Hamburguesas smash", "parent_id": 3, "sort_order": 10, "is_active": True},
    {"id": 11, "name": "Burgers dobles", "slug": "burgers-dobles", "description": "Doble medallón", "parent_id": 3, "sort_order": 11, "is_active": True},
    {"id": 12, "name": "Gaseosas", "slug": "gaseosas", "description": "Línea tradicional", "parent_id": 4, "sort_order": 12, "is_active": True},
    {"id": 13, "name": "Jugos", "slug": "jugos", "description": "Jugos naturales y exprimidos", "parent_id": 4, "sort_order": 13, "is_active": True},
    {"id": 14, "name": "Aguas", "slug": "aguas", "description": "Aguas con y sin gas", "parent_id": 4, "sort_order": 14, "is_active": True},
    {"id": 15, "name": "Cerveza", "slug": "cerveza", "description": "Cervezas nacionales", "parent_id": 4, "sort_order": 15, "is_active": True},
    {"id": 16, "name": "Helados", "slug": "helados", "description": "Potes y cucuruchos", "parent_id": 5, "sort_order": 16, "is_active": True},
    {"id": 17, "name": "Tortas", "slug": "tortas", "description": "Porciones y minis", "parent_id": 5, "sort_order": 17, "is_active": True},
    {"id": 18, "name": "Sin TACC", "slug": "sin-tacc", "description": "Opciones aptas celíacos", "parent_id": None, "sort_order": 18, "is_active": True},
    {"id": 19, "name": "Veggie", "slug": "veggie", "description": "Opciones vegetarianas", "parent_id": None, "sort_order": 19, "is_active": True},
    {"id": 20, "name": "Combos", "slug": "combos", "description": "Combos promocionales", "parent_id": None, "sort_order": 20, "is_active": True},
]

INGREDIENT_SEED = [
    {"id": 1, "name": "Queso mozzarella", "slug": "queso-mozzarella", "description": "Queso mozzarella", "is_active": True},
    {"id": 2, "name": "Salsa de tomate", "slug": "salsa-de-tomate", "description": "Salsa tradicional", "is_active": True},
    {"id": 3, "name": "Jamón cocido", "slug": "jamon-cocido", "description": "Jamón natural", "is_active": True},
    {"id": 4, "name": "Pepperoni", "slug": "pepperoni", "description": "Rodajas de pepperoni", "is_active": True},
    {"id": 5, "name": "Aceitunas", "slug": "aceitunas", "description": "Aceitunas verdes", "is_active": True},
    {"id": 6, "name": "Cebolla", "slug": "cebolla", "description": "Cebolla fresca", "is_active": True},
    {"id": 7, "name": "Morrón", "slug": "morron", "description": "Morrón asado", "is_active": True},
    {"id": 8, "name": "Champiñones", "slug": "champinones", "description": "Champiñones frescos", "is_active": True},
    {"id": 9, "name": "Rúcula", "slug": "rucula", "description": "Rúcula fresca", "is_active": True},
    {"id": 10, "name": "Parmesano", "slug": "parmesano", "description": "Queso parmesano rallado", "is_active": True},
    {"id": 11, "name": "Carne vacuna", "slug": "carne-vacuna", "description": "Blend de carne", "is_active": True},
    {"id": 12, "name": "Panceta", "slug": "panceta", "description": "Panceta ahumada", "is_active": True},
    {"id": 13, "name": "Lechuga", "slug": "lechuga", "description": "Lechuga crespa", "is_active": True},
    {"id": 14, "name": "Tomate", "slug": "tomate", "description": "Rodajas de tomate", "is_active": True},
    {"id": 15, "name": "Cebolla caramelizada", "slug": "cebolla-caramelizada", "description": "Cebolla caramelizada", "is_active": True},
    {"id": 16, "name": "Mayonesa", "slug": "mayonesa", "description": "Salsa mayonesa", "is_active": True},
    {"id": 17, "name": "Ketchup", "slug": "ketchup", "description": "Salsa ketchup", "is_active": True},
    {"id": 18, "name": "Mostaza", "slug": "mostaza", "description": "Salsa mostaza", "is_active": True},
    {"id": 19, "name": "Pollo", "slug": "pollo", "description": "Pechuga grillada", "is_active": True},
    {"id": 20, "name": "Atún", "slug": "atun", "description": "Atún al natural", "is_active": True},
    {"id": 21, "name": "Huevo", "slug": "huevo", "description": "Huevo duro", "is_active": True},
    {"id": 22, "name": "Choclo", "slug": "choclo", "description": "Granos de maíz", "is_active": True},
    {"id": 23, "name": "Orégano", "slug": "oregano", "description": "Orégano seco", "is_active": True},
    {"id": 24, "name": "Albahaca", "slug": "albahaca", "description": "Hojas de albahaca", "is_active": True},
    {"id": 25, "name": "Ajo", "slug": "ajo", "description": "Ajo picado", "is_active": True},
    {"id": 26, "name": "Provolone", "slug": "provolone", "description": "Queso provolone", "is_active": True},
    {"id": 27, "name": "Roquefort", "slug": "roquefort", "description": "Queso azul", "is_active": True},
    {"id": 28, "name": "Palta", "slug": "palta", "description": "Palta fresca", "is_active": True},
    {"id": 29, "name": "Hongos", "slug": "hongos", "description": "Mix de hongos", "is_active": True},
    {"id": 30, "name": "Masa integral", "slug": "masa-integral", "description": "Base integral", "is_active": True},
]

SEED_USERS = [
    {"first_name": "Sofía", "last_name": "Admin", "email": "admin2@foodstore.local", "roles": ["ADMIN"]},
    {"first_name": "Martín", "last_name": "Stock", "email": "stock@foodstore.local", "roles": ["STOCK"]},
    {"first_name": "Lucía", "last_name": "Operaciones", "email": "pedidos@foodstore.local", "roles": ["PEDIDOS"]},
    {"first_name": "Carlos", "last_name": "Mixto", "email": "operador@foodstore.local", "roles": ["STOCK", "PEDIDOS"]},
    {"first_name": "Ana", "last_name": "Cliente", "email": "cliente1@foodstore.local", "roles": ["CLIENT"]},
    {"first_name": "Diego", "last_name": "Cliente", "email": "cliente2@foodstore.local", "roles": ["CLIENT"]},
    {"first_name": "Valentina", "last_name": "Cliente", "email": "cliente3@foodstore.local", "roles": ["CLIENT"]},
]


def _build_product_seed() -> list[dict]:
    product_templates = [
        "Pizza Muzzarella", "Pizza Napolitana", "Pizza Fugazzeta", "Pizza Especial", "Pizza Cuatro Quesos",
        "Pizza Pepperoni", "Pizza Rúcula", "Pizza Provolone", "Pizza Calabresa", "Pizza Veggie",
        "Empanada Carne", "Empanada Jamón y Queso", "Empanada Pollo", "Empanada Verdura", "Empanada Caprese",
        "Empanada Atún", "Empanada Roquefort", "Empanada Choclo", "Empanada Humita", "Empanada Criolla",
        "Burger Clásica", "Burger Doble", "Burger Bacon", "Burger Champi", "Burger Provoleta",
        "Burger BBQ", "Burger Veggie", "Burger Crispy", "Burger Americana", "Burger Completa",
        "Combo Pizza + Gaseosa", "Combo 6 Empanadas", "Combo Burger + Papas", "Combo Familiar", "Combo Office",
        "Limonada", "Gaseosa Cola", "Agua Mineral", "Helado 1/4", "Brownie",
    ]

    rows: list[dict] = []
    for index, name in enumerate(product_templates, start=1):
        slug = (
            name.lower()
            .replace("+", "-")
            .replace(" ", "-")
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
            .replace("ñ", "n")
            .replace("/", "-")
        )
        rows.append(
            {
                "id": index,
                "name": name,
                "slug": slug,
                "description": f"{name} preparado al momento.",
                "price": Decimal("2500.00") + Decimal(index * 125),
                "stock_quantity": 10 + (index % 9),
                "is_active": True,
                "is_available": True,
            }
        )
    return rows


PRODUCT_SEED = _build_product_seed()


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


async def _ensure_user(session, *, first_name: str, last_name: str, email: str, raw_password: str, role_codes: list[str]) -> None:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    full_name = f"{first_name} {last_name}"

    if user is None:
        user = User(
            first_name=first_name,
            last_name=last_name,
            full_name=full_name,
            email=email,
            hashed_password=hash_password(raw_password),
            is_active=True,
        )
        session.add(user)
        await session.flush()
    else:
        user.first_name = first_name
        user.last_name = last_name
        user.full_name = full_name
        user.hashed_password = hash_password(raw_password)
        user.is_active = True
        user.updated_at = utc_now()
        await session.flush()

    for role_code in role_codes:
        role_result = await session.execute(select(Role).where(Role.code == role_code))
        role = role_result.scalar_one()
        assignment_result = await session.execute(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        )
        if assignment_result.scalar_one_or_none() is None:
            session.add(UserRole(user_id=user.id, role_id=role.id))


async def _upsert_product_relations(session) -> None:
    for product in PRODUCT_SEED:
        product_id = product["id"]

        if product_id <= 10:
            category_ids = [1, 6] if product_id % 2 == 0 else [1, 7]
            ingredient_ids = [1, 2, 5, 23, 24, 10 + (product_id % 10)]
        elif product_id <= 20:
            category_ids = [2, 8] if product_id % 2 == 0 else [2, 9]
            ingredient_ids = [2, 3, 6, 7, 21, 22, 25]
        elif product_id <= 30:
            category_ids = [3, 10] if product_id % 2 == 0 else [3, 11]
            ingredient_ids = [11, 12, 13, 14, 16, 17, 18]
        elif product_id <= 35:
            category_ids = [20]
            ingredient_ids = [1, 2, 3, 11, 13, 16]
        elif product_id <= 38:
            category_ids = [4, 12]
            ingredient_ids = [23]
        else:
            category_ids = [5, 17]
            ingredient_ids = [10, 27]

        for category_id in category_ids:
            relation = await session.execute(
                select(ProductCategory).where(
                    ProductCategory.product_id == product_id,
                    ProductCategory.category_id == category_id,
                )
            )
            if relation.scalar_one_or_none() is None:
                session.add(ProductCategory(product_id=product_id, category_id=category_id))

        for ingredient_id in ingredient_ids:
            relation = await session.execute(
                select(ProductIngredient).where(
                    ProductIngredient.product_id == product_id,
                    ProductIngredient.ingredient_id == ingredient_id,
                )
            )
            if relation.scalar_one_or_none() is None:
                session.add(
                    ProductIngredient(
                        product_id=product_id,
                        ingredient_id=ingredient_id,
                        is_removable=ingredient_id not in {1, 2, 11},
                    )
                )

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
            await _upsert_catalog(session, PaymentStatus, PAYMENT_STATUS_SEED)
            await _upsert_catalog(session, Category, CATEGORY_SEED)
            await _upsert_catalog(session, Ingredient, INGREDIENT_SEED)
            await _upsert_catalog(session, Product, PRODUCT_SEED)

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

            for seed_user in SEED_USERS:
                await _ensure_user(
                    session,
                    first_name=seed_user["first_name"],
                    last_name=seed_user["last_name"],
                    email=seed_user["email"],
                    raw_password=settings.bootstrap_admin_password,
                    role_codes=seed_user["roles"],
                )

            await _upsert_product_relations(session)

            await session.commit()
    finally:
        await get_engine().dispose()

    print("Seed completed successfully")


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_database())


if __name__ == "__main__":
    main()
