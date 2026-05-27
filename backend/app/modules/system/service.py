from app.core.pagination import PageParams, make_paginated_response
from app.core.time import to_utc_iso
from app.core.uow import SqlAlchemyUnitOfWork
from app.modules.system.schemas import ExampleItem, ExamplePaginationResponse, HealthResponse


class SystemService:
    async def get_health(self) -> HealthResponse:
        return HealthResponse(status="ok", service="food-store-backend", timestamp=to_utc_iso())

    async def get_pagination_example(
        self,
        uow: SqlAlchemyUnitOfWork,
        page_params: PageParams,
    ) -> ExamplePaginationResponse:
        async with uow:
            items = [
                ExampleItem(id=1, code="ADMIN", label="Administrator"),
                ExampleItem(id=2, code="STOCK", label="Stock Manager"),
                ExampleItem(id=3, code="PEDIDOS", label="Order Manager"),
                ExampleItem(id=4, code="CLIENT", label="Client"),
                ExampleItem(id=5, code="COCINA", label="Cocinero"),
            ]
            start = page_params.offset
            end = start + page_params.size
            sliced = items[start:end]
            return make_paginated_response(items=sliced, total=len(items), page=page_params.page, size=page_params.size)


system_service = SystemService()
