from fastapi import APIRouter

from app.modules.auth.router import router as auth_router
from app.modules.categories.router import router as category_router
from app.modules.checkout.router import router as checkout_router
from app.modules.customer_profile.router import router as customer_profile_router
from app.modules.delivery_addresses.router import router as delivery_address_router
from app.modules.ingredients.router import allergen_router, ingredient_router
from app.modules.orders.router import router as order_router
from app.modules.products.router import router as product_router
from app.modules.products.public_router import router as public_catalog_product_router
from app.modules.system.router import router as system_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(category_router)
api_router.include_router(checkout_router)
api_router.include_router(customer_profile_router)
api_router.include_router(delivery_address_router)
api_router.include_router(ingredient_router)
api_router.include_router(allergen_router)
api_router.include_router(order_router)
api_router.include_router(product_router)
api_router.include_router(public_catalog_product_router)
api_router.include_router(system_router)
