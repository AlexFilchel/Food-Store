from dataclasses import asdict, dataclass, field
from http import HTTPStatus

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import Settings
from app.core.time import to_utc_iso

logger = structlog.get_logger("errors")


@dataclass(slots=True)
class ErrorDetail:
    field: str
    message: str


@dataclass(slots=True)
class AppError(Exception):
    status_code: int
    code: str
    title: str
    detail: str
    type_path: str = "application-error"
    errors: list[ErrorDetail] = field(default_factory=list)


def build_problem(
    request: Request,
    settings: Settings,
    *,
    status_code: int,
    title: str,
    detail: str,
    code: str,
    type_path: str,
    errors: list[dict[str, str]] | None = None,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "type": f"https://food-store.local/errors/{type_path}",
        "title": title,
        "status": status_code,
        "detail": detail,
        "code": code,
        "timestamp": to_utc_iso(),
        "instance": str(request.url.path),
    }
    if errors:
        payload["errors"] = errors
    return payload


def register_exception_handlers(app: FastAPI, settings: Settings) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=build_problem(
                request,
                settings,
                status_code=exc.status_code,
                title=exc.title,
                detail=exc.detail,
                code=exc.code,
                type_path=exc.type_path,
                errors=[asdict(detail) for detail in exc.errors],
            ),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {
                "field": ".".join(str(part) for part in error["loc"] if part != "query"),
                "message": error["msg"],
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=build_problem(
                request,
                settings,
                status_code=422,
                title="Validation Error",
                detail="The request contains invalid fields.",
                code="VALIDATION_ERROR",
                type_path="validation-error",
                errors=errors,
            ),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        title = HTTPStatus(exc.status_code).phrase
        detail = str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=build_problem(
                request,
                settings,
                status_code=exc.status_code,
                title=title,
                detail=detail,
                code=title.upper().replace(" ", "_"),
                type_path=title.lower().replace(" ", "-"),
            ),
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("request.unhandled_error", path=request.url.path)
        return JSONResponse(
            status_code=500,
            content=build_problem(
                request,
                settings,
                status_code=500,
                title="Internal Server Error",
                detail="An unexpected error occurred.",
                code="INTERNAL_SERVER_ERROR",
                type_path="internal-server-error",
            ),
        )
