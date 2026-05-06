from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.errors import AppError, build_problem
from app.core.uow import SqlAlchemyUnitOfWork, get_uow
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.errors import auth_rate_limited
from app.modules.auth.rate_limiter import LoginRateLimiter, get_login_rate_limiter
from app.modules.auth.schemas import (
    AuthLoginRequest,
    AuthLogoutRequest,
    AuthRefreshRequest,
    AuthRegisterRequest,
    AuthTokenResponse,
    AuthUserResponse,
)
from app.modules.auth.service import RequestContext, auth_service
from app.modules.identity.model import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _request_context(request: Request) -> RequestContext:
    return RequestContext(
        client_ip=request.client.host if request.client is not None else None,
        user_agent=request.headers.get("user-agent"),
    )


@router.post("/register", response_model=AuthTokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: AuthRegisterRequest,
    request: Request,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AuthTokenResponse:
    return await auth_service.register(uow, payload, _request_context(request))


@router.post("/login", response_model=AuthTokenResponse)
async def login(
    payload: AuthLoginRequest,
    request: Request,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
    limiter: Annotated[LoginRateLimiter, Depends(get_login_rate_limiter)],
) -> AuthTokenResponse | JSONResponse:
    client_ip = request.client.host if request.client is not None else "unknown"
    decision = limiter.check(client_ip)
    if not decision.allowed:
        error = auth_rate_limited(retry_after_seconds=decision.retry_after_seconds)
        problem = build_problem(
            request,
            get_settings(),
            status_code=error.status_code,
            title=error.title,
            detail=error.detail,
            code=error.code,
            type_path=error.type_path,
            errors=[{"field": detail.field, "message": detail.message} for detail in error.errors],
        )
        return JSONResponse(
            status_code=error.status_code,
            content=problem,
            headers={"Retry-After": str(decision.retry_after_seconds)},
        )

    try:
        response = await auth_service.login(uow, payload, _request_context(request))
    except AppError as exc:
        if exc.code == "AUTH_INVALID_CREDENTIALS":
            limiter.record_failure(client_ip)
        raise

    limiter.clear(client_ip)
    return response


@router.post("/refresh", response_model=AuthTokenResponse)
async def refresh(
    payload: AuthRefreshRequest,
    request: Request,
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AuthTokenResponse:
    return await auth_service.refresh(uow, payload, _request_context(request))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    payload: AuthLogoutRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> Response:
    await auth_service.logout(uow, current_user, payload)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=AuthUserResponse)
async def me(
    current_user: Annotated[User, Depends(get_current_user)],
    uow: Annotated[SqlAlchemyUnitOfWork, Depends(get_uow)],
) -> AuthUserResponse:
    return await auth_service.get_current_user_response(uow, current_user)
