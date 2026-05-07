from http import HTTPStatus

from app.core.errors import AppError


def product_not_found() -> AppError:
    return AppError(HTTPStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product Not Found", "The requested product does not exist.", "product-not-found")


def product_duplicate() -> AppError:
    return AppError(HTTPStatus.CONFLICT, "PRODUCT_DUPLICATE", "Duplicate Product", "Another active product already uses that identity.", "product-duplicate")


def product_invalid_category() -> AppError:
    return AppError(HTTPStatus.BAD_REQUEST, "PRODUCT_INVALID_CATEGORY", "Invalid Category", "One or more category ids are missing, inactive or deleted.", "product-invalid-category")


def product_invalid_ingredient() -> AppError:
    return AppError(HTTPStatus.BAD_REQUEST, "PRODUCT_INVALID_INGREDIENT", "Invalid Ingredient", "One or more ingredient ids are missing, inactive or deleted.", "product-invalid-ingredient")


def product_invalid_price() -> AppError:
    return AppError(HTTPStatus.BAD_REQUEST, "PRODUCT_INVALID_PRICE", "Invalid Price", "Product price must be greater than or equal to zero.", "product-invalid-price")


def product_invalid_stock() -> AppError:
    return AppError(HTTPStatus.BAD_REQUEST, "PRODUCT_INVALID_STOCK", "Invalid Stock", "Product stock quantity must be greater than or equal to zero.", "product-invalid-stock")
