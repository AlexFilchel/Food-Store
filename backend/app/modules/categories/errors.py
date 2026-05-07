from http import HTTPStatus

from app.core.errors import AppError


def category_not_found() -> AppError:
    return AppError(
        status_code=HTTPStatus.NOT_FOUND,
        code="CATEGORY_NOT_FOUND",
        title="Category Not Found",
        detail="The requested category does not exist.",
        type_path="category-not-found",
    )


def category_duplicate() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="CATEGORY_DUPLICATE",
        title="Duplicate Category",
        detail="Another active sibling category already uses that identity.",
        type_path="category-duplicate",
    )


def category_invalid_parent() -> AppError:
    return AppError(
        status_code=HTTPStatus.BAD_REQUEST,
        code="CATEGORY_INVALID_PARENT",
        title="Invalid Parent Category",
        detail="The selected parent category does not exist or is not active.",
        type_path="category-invalid-parent",
    )


def category_cycle_detected() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="CATEGORY_CYCLE_DETECTED",
        title="Category Cycle Detected",
        detail="The requested parent assignment would create an invalid category cycle.",
        type_path="category-cycle-detected",
    )


def category_has_children() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="CATEGORY_HAS_CHILDREN",
        title="Category Has Active Children",
        detail="The category still has active child categories and cannot be deleted.",
        type_path="category-has-children",
    )


def category_has_products() -> AppError:
    return AppError(
        status_code=HTTPStatus.CONFLICT,
        code="CATEGORY_HAS_PRODUCTS",
        title="Category Has Products",
        detail="The category is referenced by active products and cannot be deleted.",
        type_path="category-has-products",
    )
