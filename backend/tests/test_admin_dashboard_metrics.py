from datetime import UTC, datetime
from decimal import Decimal

import pytest
from app.core.database import get_session_factory
from app.modules.orders.model import Order, OrderItem
from app.modules.payments.model import Payment


async def login_admin(client):
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@test.local", "password": "Admin1234!"},
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def create_order_payment_fixture(
    *,
    user_id: int,
    state_id: int,
    payment_status_id: int,
    product_name: str,
    product_slug: str,
    unit_price: Decimal,
    quantity: int,
    payment_created_at: datetime,
    order_created_at: datetime,
):
    session_factory = get_session_factory()
    async with session_factory() as session:
        order = Order(
            user_id=user_id,
            state_id=state_id,
            payment_method_id=1,
            order_number=f"ORD-MET-{int(payment_created_at.timestamp())}-{quantity}",
            delivery_recipient_name="Admin User",
            delivery_phone="123",
            delivery_street="Main",
            delivery_street_number="123",
            delivery_floor=None,
            delivery_apartment=None,
            delivery_city="CABA",
            delivery_province="BA",
            delivery_postal_code="1000",
            delivery_reference=None,
            subtotal=unit_price * Decimal(quantity),
            notes=None,
            created_at=order_created_at,
            updated_at=order_created_at,
        )
        session.add(order)
        await session.flush()

        session.add(
            OrderItem(
                order_id=order.id,
                product_id=1,
                product_name=product_name,
                product_slug=product_slug,
                unit_price=unit_price,
                quantity=quantity,
                line_total=unit_price * Decimal(quantity),
                removed_ingredients="",
            )
        )

        session.add(
            Payment(
                order_id=order.id,
                payment_method_id=1,
                status_id=payment_status_id,
                amount=unit_price * Decimal(quantity),
                currency="ARS",
                idempotency_key=f"idem-{order.id}-{payment_status_id}",
                attempts=0,
                created_at=payment_created_at,
                updated_at=payment_created_at,
            )
        )
        await session.commit()


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_permissions(client):
    anon = await client.get("/api/v1/admin/dashboard/metrics")
    assert anon.status_code == 401

    customer = await client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Cliente",
            "last_name": "Demo",
            "email": "metrics-client@test.local",
            "password": "StrongPass123!",
        },
    )
    customer_headers = {"Authorization": f"Bearer {customer.json()['access_token']}"}
    forbidden = await client.get("/api/v1/admin/dashboard/metrics", headers=customer_headers)
    assert forbidden.status_code == 403

    admin_headers = await login_admin(client)
    ok = await client.get("/api/v1/admin/dashboard/metrics", headers=admin_headers)
    assert ok.status_code == 200


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_formula_and_empty_period(client):
    admin_headers = await login_admin(client)
    from_utc = datetime(2026, 5, 10, 0, 0, tzinfo=UTC)
    to_utc = datetime(2026, 5, 12, 23, 59, tzinfo=UTC)

    await create_order_payment_fixture(
        user_id=1,
        state_id=2,
        payment_status_id=2,
        product_name="Pizza",
        product_slug="pizza",
        unit_price=Decimal("100.00"),
        quantity=2,
        payment_created_at=datetime(2026, 5, 11, 3, 0, tzinfo=UTC),
        order_created_at=datetime(2026, 5, 11, 2, 0, tzinfo=UTC),
    )
    await create_order_payment_fixture(
        user_id=1,
        state_id=6,
        payment_status_id=2,
        product_name="Burger",
        product_slug="burger",
        unit_price=Decimal("80.00"),
        quantity=1,
        payment_created_at=datetime(2026, 5, 11, 4, 0, tzinfo=UTC),
        order_created_at=datetime(2026, 5, 11, 4, 0, tzinfo=UTC),
    )
    await create_order_payment_fixture(
        user_id=1,
        state_id=1,
        payment_status_id=1,
        product_name="Empanada",
        product_slug="empanada",
        unit_price=Decimal("50.00"),
        quantity=2,
        payment_created_at=datetime(2026, 5, 11, 5, 0, tzinfo=UTC),
        order_created_at=datetime(2026, 5, 11, 5, 0, tzinfo=UTC),
    )

    response = await client.get(
        "/api/v1/admin/dashboard/metrics",
        params={
            "from": from_utc.isoformat(),
            "to": to_utc.isoformat(),
            "granularity": "day",
            "timezone": "America/Argentina/Buenos_Aires",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["effective_filters"]["from"]
    assert payload["summary"]["gross_approved_revenue"] == "200.00"
    assert payload["summary"]["counted_orders"] == 1
    assert payload["summary"]["average_ticket"] == "200.00"
    assert isinstance(payload.get("category_insights"), list)
    assert isinstance(payload.get("recent_sales"), list)
    assert isinstance(payload.get("operational_alerts"), list)

    empty = await client.get(
        "/api/v1/admin/dashboard/metrics",
        params={
            "from": "2020-01-01T00:00:00Z",
            "to": "2020-01-02T00:00:00Z",
        },
        headers=admin_headers,
    )
    assert empty.status_code == 200
    assert empty.json()["summary"] == {
        "gross_approved_revenue": "0.00",
        "counted_orders": 0,
        "average_ticket": "0.00",
        "pending_operational_count": 0,
    }
    assert empty.json().get("kpi_comparisons") is not None


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_timezone_and_validation(client):
    admin_headers = await login_admin(client)
    await create_order_payment_fixture(
        user_id=1,
        state_id=2,
        payment_status_id=2,
        product_name="Mila",
        product_slug="mila",
        unit_price=Decimal("100.00"),
        quantity=1,
        payment_created_at=datetime(2026, 5, 11, 2, 30, tzinfo=UTC),
        order_created_at=datetime(2026, 5, 11, 2, 0, tzinfo=UTC),
    )

    response = await client.get(
        "/api/v1/admin/dashboard/metrics",
        params={
            "from": "2026-05-10T00:00:00Z",
            "to": "2026-05-12T00:00:00Z",
            "granularity": "day",
            "timezone": "America/Argentina/Buenos_Aires",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    # sales_by_period should only contain buckets with sales (order_count > 0)
    sales_by_period = response.json()["sales_by_period"]
    assert len(sales_by_period) > 0, "Should have at least one bucket with sales"
    assert all(bucket["order_count"] > 0 for bucket in sales_by_period), "All buckets should have at least one order"
    # Payment created at 2026-05-11 02:30 UTC = 2026-05-10 23:30 in BsAs timezone (UTC-3)
    assert any(bucket["label"] == "2026-05-10" for bucket in sales_by_period), "Should have sales on 2026-05-10 (BsAs timezone)"
    assert all("bucket_start" in bucket and "bucket_end" in bucket for bucket in sales_by_period)

    invalid_granularity = await client.get(
        "/api/v1/admin/dashboard/metrics",
        params={"granularity": "hour"},
        headers=admin_headers,
    )
    assert invalid_granularity.status_code == 422

    invalid_range = await client.get(
        "/api/v1/admin/dashboard/metrics",
        params={"from": "2026-05-12T00:00:00Z", "to": "2026-05-10T00:00:00Z"},
        headers=admin_headers,
    )
    assert invalid_range.status_code == 422


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_top_products_and_zero_states(client):
    admin_headers = await login_admin(client)
    event_time = datetime(2026, 5, 20, 10, 0, tzinfo=UTC)
    await create_order_payment_fixture(
        user_id=1,
        state_id=2,
        payment_status_id=2,
        product_name="Producto Snapshot",
        product_slug="prod-snapshot",
        unit_price=Decimal("300.00"),
        quantity=1,
        payment_created_at=event_time,
        order_created_at=event_time,
    )

    response = await client.get(
        "/api/v1/admin/dashboard/metrics",
        params={"from": "2026-05-19T00:00:00Z", "to": "2026-05-21T23:59:00Z"},
        headers=admin_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["top_products"][0]["display_name"] == "Producto Snapshot"
    assert payload["health"]["pending_orders_count"] >= 0
    assert payload["health"]["stuck_threshold_minutes"] >= 30
    assert "bucket_start" in payload["sales_by_period"][0]
    if payload["recent_sales"]:
        assert "order_number" in payload["recent_sales"][0]
        assert "approved_at" in payload["recent_sales"][0]

    states = {item["state_code"]: item["count"] for item in payload["orders_by_state"]}
    assert "PENDIENTE" in states
    assert "ENTREGADO" in states
