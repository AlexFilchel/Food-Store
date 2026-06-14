"""Upload product images from local folder to Cloudinary and update the DB.

Run from the backend/ directory:
    python upload_product_images.py

Requires CLOUDINARY_URL in .env (loaded automatically by pydantic-settings).
"""

import asyncio
import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import cloudinary
import cloudinary.uploader
from sqlalchemy import select

sys.path.insert(0, str(Path(__file__).parent))

from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory, import_models
from app.modules.products.model import Product

IMAGES_DIR = Path(__file__).parent.parent / "imagenes para cloudinary"

# Maps every product name (as in seed) to the image filename in IMAGES_DIR.
# Empanadas share a single image; Combo 6 Empanadas uses the same one.
PRODUCT_IMAGE_MAP: dict[str, str] = {
    "Pizza Muzzarella": "pizza_muzzarella.jpg",
    "Pizza Napolitana": "pizza_napolitana.jpg",
    "Pizza Fugazzeta": "pizza_fugazzeta.jpg",
    "Pizza Especial": "pizza_especial.jpg",
    "Pizza Cuatro Quesos": "pizza_cuatro_quesos.jpg",
    "Pizza Pepperoni": "pizza_peperoni.jpg",
    "Pizza Rúcula": "pizza_rucula.jpg",
    "Pizza Provolone": "pizza_provolone.jpg",
    "Pizza Calabresa": "pizza_calabresa.jpg",
    "Pizza Veggie": "pizza_veggie.jpg",
    "Empanada Carne": "empanadas.jpg",
    "Empanada Jamón y Queso": "empanadas.jpg",
    "Empanada Pollo": "empanadas.jpg",
    "Empanada Verdura": "empanadas.jpg",
    "Empanada Caprese": "empanadas.jpg",
    "Empanada Atún": "empanadas.jpg",
    "Empanada Roquefort": "empanadas.jpg",
    "Empanada Choclo": "empanadas.jpg",
    "Empanada Humita": "empanadas.jpg",
    "Empanada Criolla": "empanadas.jpg",
    "Burger Clásica": "burger_clasica.jpg",
    "Burger Doble": "burger_doble.jpg",
    "Burger Bacon": "burger_bacon.jpg",
    "Burger Champi": "burger_champi.jpg",
    "Burger Provoleta": "burger_provoleta.jpg",
    "Burger BBQ": "burger_bbq.jpg",
    "Burger Veggie": "burger_veggie.jpg",
    "Burger Crispy": "burger_crispy.jpg",
    "Burger Americana": "burger_americana.jpg",
    "Burger Completa": "burger_completa.jpg",
    "Combo Pizza + Gaseosa": "combo_pizza_mas_gaseosa.jpg",
    "Combo 6 Empanadas": "empanadas.jpg",
    "Combo Burger + Papas": "combo_burger_mas_papas.jpg",
    "Combo Familiar": "combo_familiar.jpg",
    "Combo Office": "combo_office.jpg",
    "Limonada": "limonada.jpg",
    "Gaseosa Cola": "gaseosa_cola.jpg",
    "Agua Mineral": "agua_mineral.jpg",
    "Helado 1/4": "helado_un_cuarto.png",
    "Brownie": "brownie.jpg",
}


def _upload_unique_images() -> dict[str, str]:
    """Upload each unique image file to Cloudinary once. Returns filename → secure_url."""
    url_cache: dict[str, str] = {}
    unique_filenames = sorted(set(PRODUCT_IMAGE_MAP.values()))

    for filename in unique_filenames:
        file_path = IMAGES_DIR / filename
        if not file_path.exists():
            print(f"  WARNING: image not found, skipping: {file_path}")
            continue

        public_id = f"food-store/products/{Path(filename).stem}"
        print(f"  Uploading {filename} ...", end=" ", flush=True)
        result = cloudinary.uploader.upload(
            str(file_path),
            public_id=public_id,
            overwrite=True,
            resource_type="image",
        )
        url = result["secure_url"]
        url_cache[filename] = url
        print(f"OK → {url}")

    return url_cache


async def _update_products(url_cache: dict[str, str]) -> None:
    """Set image_url on every product row in the DB."""
    import_models()
    session_factory = get_session_factory()

    async with session_factory() as session:
        for product_name, filename in PRODUCT_IMAGE_MAP.items():
            url = url_cache.get(filename)
            if url is None:
                print(f"  SKIP (no URL cached): {product_name}")
                continue

            result = await session.execute(select(Product).where(Product.name == product_name))
            product = result.scalar_one_or_none()
            if product is None:
                print(f"  WARNING: product not in DB: {product_name}")
                continue

            product.image_url = url

        await session.commit()
        print(f"  Updated {len(PRODUCT_IMAGE_MAP)} products in DB.")

    await get_engine().dispose()


async def run() -> None:
    settings = get_settings()
    if not settings.cloudinary_url:
        print("ERROR: CLOUDINARY_URL is not set in .env")
        sys.exit(1)

    parsed = urlparse(settings.cloudinary_url)
    cloudinary.config(
        cloud_name=parsed.hostname,
        api_key=parsed.username,
        api_secret=parsed.password,
        secure=True,
    )
    print(f"Cloudinary configured: cloud={parsed.hostname}, key={parsed.username}")

    print("=== Uploading images to Cloudinary ===")
    url_cache = _upload_unique_images()

    print("\n=== Updating products in DB ===")
    await _update_products(url_cache)

    print("\nDone!")


def main() -> None:
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run())


if __name__ == "__main__":
    main()
