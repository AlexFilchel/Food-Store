from http import HTTPStatus

from app.core.errors import AppError


def ingredient_not_found() -> AppError:
    return AppError(HTTPStatus.NOT_FOUND, "INGREDIENT_NOT_FOUND", "Ingredient Not Found", "The requested ingredient does not exist.", "ingredient-not-found")


def ingredient_duplicate() -> AppError:
    return AppError(HTTPStatus.CONFLICT, "INGREDIENT_DUPLICATE", "Duplicate Ingredient", "Another active ingredient already uses that identity.", "ingredient-duplicate")


def ingredient_invalid_allergen() -> AppError:
    return AppError(
        HTTPStatus.BAD_REQUEST,
        "INGREDIENT_INVALID_ALLERGEN",
        "Invalid Allergen",
        "One or more allergen ids are missing, inactive or deleted.",
        "ingredient-invalid-allergen",
    )


def allergen_not_found() -> AppError:
    return AppError(HTTPStatus.NOT_FOUND, "ALLERGEN_NOT_FOUND", "Allergen Not Found", "The requested allergen does not exist.", "allergen-not-found")


def allergen_duplicate() -> AppError:
    return AppError(HTTPStatus.CONFLICT, "ALLERGEN_DUPLICATE", "Duplicate Allergen", "Another active allergen already uses that identity.", "allergen-duplicate")


def allergen_in_use() -> AppError:
    return AppError(
        HTTPStatus.CONFLICT,
        "ALLERGEN_IN_USE",
        "Allergen In Use",
        "The allergen is referenced by active ingredients and cannot be deleted.",
        "allergen-in-use",
    )
