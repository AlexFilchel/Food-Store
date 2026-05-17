from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.core.database import get_session_factory
from app.modules.orders.model import Order, OrderItem
from app.modules.payments.model import Payment
from app.modules.system_configuration.model import SystemConfigurationAudit


async def login_admin(client):
    response = await client.post('/api/v1/auth/login', json={'email': 'admin@test.local', 'password': 'Admin1234!'})
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


async def register_customer(client, *, email: str):
    response = await client.post(
        '/api/v1/auth/register',
        json={'first_name': 'Cli', 'last_name': 'Ent', 'email': email, 'password': 'StrongPass123!'},
    )
    assert response.status_code == 201
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


async def create_address(client, headers):
    response = await client.post(
        '/api/v1/customer/addresses',
        headers=headers,
        json={
            'recipient_name': 'Cli Ent',
            'phone': '+5491112345678',
            'street': 'Main',
            'street_number': '123',
            'city': 'CABA',
            'province': 'BA',
            'postal_code': '1000',
            'is_default': True,
        },
    )
    assert response.status_code == 201
    return response.json()


async def create_product(client, headers, *, name: str):
    response = await client.post(
        '/api/v1/admin/products',
        headers=headers,
        json={
            'name': name,
            'description': 'x',
            'price': '10.00',
            'stock_quantity': 10,
            'is_active': True,
            'is_available': True,
            'category_ids': [],
            'ingredients': [],
        },
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_system_configuration_permissions_and_public_endpoint(client):
    anon = await client.get('/api/v1/admin/system/configuration')
    assert anon.status_code == 401

    customer = await client.post(
        '/api/v1/auth/register',
        json={'first_name': 'A', 'last_name': 'B', 'email': 'cfg-client@test.local', 'password': 'StrongPass123!'},
    )
    customer_headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    forbidden = await client.get('/api/v1/admin/system/configuration', headers=customer_headers)
    assert forbidden.status_code == 403

    public_response = await client.get('/api/v1/system/configuration/public')
    assert public_response.status_code == 200
    values = public_response.json()['values']
    assert 'store.public_name' in values
    assert 'orders.max_items_per_order' not in values


@pytest.mark.asyncio
async def test_system_configuration_order_limit_ranges_and_nullable_public_contact(client):
    headers = await login_admin(client)

    invalid_limits = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={
            'updates': {
                'orders.max_items_per_order': {'value': 0},
                'orders.max_quantity_per_item': {'value': 100},
            }
        },
    )
    assert invalid_limits.status_code == 422
    errors = {entry['field']: entry['message'] for entry in invalid_limits.json()['errors']}
    assert 'body.updates.orders.max_items_per_order.value' in errors
    assert 'body.updates.orders.max_quantity_per_item.value' in errors

    nullable = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={
            'updates': {
                'store.contact_phone': {'value': ''},
                'store.contact_email': {'value': None},
            }
        },
    )
    assert nullable.status_code == 200
    items = {row['key']: row for row in nullable.json()['items']}
    assert items['store.contact_phone']['effective_value'] is None
    assert items['store.contact_email']['effective_value'] is None

    public_response = await client.get('/api/v1/system/configuration/public')
    public_values = public_response.json()['values']
    assert public_values['store.contact_phone'] is None
    assert public_values['store.contact_email'] is None


@pytest.mark.asyncio
async def test_system_configuration_patch_validation_atomic_and_conflict(client):
    headers = await login_admin(client)
    first = await client.get('/api/v1/admin/system/configuration', headers=headers)
    assert first.status_code == 200
    items = {row['key']: row for row in first.json()['items']}

    invalid = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={
            'updates': {
                'orders.max_items_per_order': {'value': 20, 'expected_version': items['orders.max_items_per_order']['version']},
                'business.timezone': {'value': 'INVALID/TZ', 'expected_version': items['business.timezone']['version']},
            }
        },
    )
    assert invalid.status_code == 422

    after_invalid = await client.get('/api/v1/admin/system/configuration', headers=headers)
    after_items = {row['key']: row for row in after_invalid.json()['items']}
    assert after_items['orders.max_items_per_order']['effective_value'] == items['orders.max_items_per_order']['effective_value']

    ok = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'orders.max_items_per_order': {'value': 30, 'expected_version': after_items['orders.max_items_per_order']['version']}}},
    )
    assert ok.status_code == 200

    stale = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'orders.max_items_per_order': {'value': 40, 'expected_version': after_items['orders.max_items_per_order']['version']}}},
    )
    assert stale.status_code == 409


@pytest.mark.asyncio
async def test_system_configuration_registry_defaults_unknown_and_read_only(client):
    headers = await login_admin(client)

    listed = await client.get('/api/v1/admin/system/configuration', headers=headers)
    assert listed.status_code == 200
    items = {row['key']: row for row in listed.json()['items']}

    assert items['store.public_name']['is_default_backed'] is True
    assert items['store.public_name']['visibility'] == 'public'
    assert items['system.registry_version']['editable'] is False

    unknown = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'system.unknown_key': {'value': 'x'}}},
    )
    assert unknown.status_code == 422

    readonly = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'system.registry_version': {'value': 2}}},
    )
    assert readonly.status_code == 422


@pytest.mark.asyncio
async def test_system_configuration_audit_entries_for_real_changes_only(client):
    headers = await login_admin(client)

    ok = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={
            'updates': {
                'store.public_name': {'value': 'Food Store Premium'},
                'store.contact_phone': {'value': '+5491111111111'},
                'orders.max_items_per_order': {'value': 35},
            },
            'reason': 'ops adjustment',
        },
    )
    assert ok.status_code == 200

    async with get_session_factory()() as session:
        count = len((await session.execute(SystemConfigurationAudit.__table__.select())).fetchall())
        assert count == 3

    rejected = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'business.timezone': {'value': 'Bad/TZ'}}},
    )
    assert rejected.status_code == 422

    noop = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'store.public_name': {'value': 'Food Store Premium'}}},
    )
    assert noop.status_code == 200

    async with get_session_factory()() as session:
        count_after = len((await session.execute(SystemConfigurationAudit.__table__.select())).fetchall())
        assert count_after == 3


@pytest.mark.asyncio
async def test_order_creation_respects_ordering_enabled(client):
    headers = await login_admin(client)
    customer_headers = await register_customer(client, email='cfg-ordering@test.local')
    address = await create_address(client, customer_headers)
    product = await create_product(client, headers, name='Cfg Product')

    enabled_response = await client.post(
        '/api/v1/orders',
        headers=customer_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address['id'],
        },
    )
    assert enabled_response.status_code == 201
    order_id = enabled_response.json()['id']

    await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'store.ordering_enabled': {'value': False}}},
    )

    tracking_list = await client.get('/api/v1/orders', headers=customer_headers)
    assert tracking_list.status_code == 200

    tracking_detail = await client.get(f'/api/v1/orders/{order_id}', headers=customer_headers)
    assert tracking_detail.status_code == 200

    response = await client.post(
        '/api/v1/orders',
        headers=customer_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address['id'],
        },
    )
    assert response.status_code == 409
    assert response.json()['code'] == 'ORDERING_DISABLED'


@pytest.mark.asyncio
async def test_admin_dashboard_metrics_uses_configured_timezone_by_default(client):
    headers = await login_admin(client)
    update = await client.patch(
        '/api/v1/admin/system/configuration',
        headers=headers,
        json={'updates': {'business.timezone': {'value': 'UTC'}}},
    )
    assert update.status_code == 200

    event_time = datetime(2026, 5, 11, 2, 30, tzinfo=UTC)
    async with get_session_factory()() as session:
        order = Order(
            user_id=1,
            state_id=2,
            payment_method_id=1,
            order_number='ORD-CFG-METRICS-1',
            delivery_recipient_name='Admin User',
            delivery_phone='123',
            delivery_street='Main',
            delivery_street_number='123',
            delivery_floor=None,
            delivery_apartment=None,
            delivery_city='CABA',
            delivery_province='BA',
            delivery_postal_code='1000',
            delivery_reference=None,
            subtotal=Decimal('100.00'),
            notes=None,
            created_at=event_time,
            updated_at=event_time,
        )
        session.add(order)
        await session.flush()
        session.add(
            OrderItem(
                order_id=order.id,
                product_id=1,
                product_name='Cfg Metrics Product',
                product_slug='cfg-metrics-product',
                unit_price=Decimal('100.00'),
                quantity=1,
                line_total=Decimal('100.00'),
                removed_ingredients='',
            )
        )
        session.add(
            Payment(
                order_id=order.id,
                payment_method_id=1,
                status_id=2,
                amount=Decimal('100.00'),
                currency='ARS',
                idempotency_key='cfg-metrics-payment-1',
                attempts=0,
                created_at=event_time,
                updated_at=event_time,
            )
        )
        await session.commit()

    response = await client.get(
        '/api/v1/admin/dashboard/metrics',
        headers=headers,
        params={
            'from': '2026-05-11T00:00:00Z',
            'to': '2026-05-12T00:00:00Z',
            'granularity': 'day',
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload['effective_filters']['timezone'] == 'UTC'
    assert payload['sales_by_period'][0]['label'] == '2026-05-11'
