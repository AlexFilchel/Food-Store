from pydantic import BaseModel

from app.core.pagination import PaginatedResponse


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str


class ExampleItem(BaseModel):
    id: int
    code: str
    label: str


ExamplePaginationResponse = PaginatedResponse[ExampleItem]
