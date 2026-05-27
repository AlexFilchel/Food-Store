from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import get_metadata, get_session_factory, import_models
from app.db.seed import seed_database
from app.main import create_app
from app.modules.orders.model import OrderHistory
from app.modules.payments.gateway import MercadoPagoPaymentStatus, MercadoPagoPreferenceResult
from app.modules.payments.service import payment_service


async def login_admin(client):
    response = await client.post('/api/v1/auth/login', json={'email': 'admin@test.local', 'password': 'Admin1234!'})
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


async def register_user(client, *, email: str, first_name: str = 'Ada', last_name: str = 'Lovelace'):
    response = await client.post(
        '/api/v1/auth/register',
        json={
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'password': 'StrongPass123!',
        },
    )
    return response


async def assign_role(*, email: str, role_code: str) -> None:
    from app.modules.identity.model import Role, User, UserRole

    async with get_session_factory()() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        role = (await session.execute(select(Role).where(Role.code == role_code))).scalar_one()
        existing = await session.execute(select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id))
        if existing.scalar_one_or_none() is None:
            session.add(UserRole(user_id=user.id, role_id=role.id))
        await session.commit()


async def create_product(client, headers, *, name: str, stock: int = 10, price: str = '20.00'):
    response = await client.post(
        '/api/v1/admin/products',
        json={
            'name': name,
            'description': f'{name} descripción',
            'price': price,
            'stock_quantity': stock,
            'is_active': True,
            'is_available': True,
            'category_ids': [],
            'ingredients': [],
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def address_payload(**overrides):
    payload = {
        'recipient_name': 'Ada Lovelace',
        'phone': '+5491112345678',
        'street': 'Av Siempre Viva',
        'street_number': '742',
        'city': 'CABA',
        'province': 'Buenos Aires',
        'postal_code': '1000',
        'is_default': True,
    }
    payload.update(overrides)
    return payload


async def create_confirmed_order(client, *, customer_email: str) -> tuple[dict[str, str], int]:
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name=f'Producto {customer_email}')
    customer = await register_user(client, email=customer_email)
    assert customer.status_code == 201
    customer_headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

    address = await client.post('/api/v1/customer/addresses', headers=customer_headers, json=address_payload())
    assert address.status_code == 201
    address_id = address.json()['id']

    order_response = await client.post(
        '/api/v1/orders',
        headers=customer_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address_id,
            'payment_method_code': 'MERCADOPAGO',
            'notes': f'Nota {customer_email}',
        },
    )
    assert order_response.status_code == 201
    order_id = order_response.json()['id']

    confirm = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'CONFIRMADO'},
    )
    assert confirm.status_code == 200
    return customer_headers, order_id


async def create_pending_order(client, *, customer_email: str) -> tuple[dict[str, str], int]:
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name=f'Producto {customer_email}')
    customer = await register_user(client, email=customer_email)
    assert customer.status_code == 201
    customer_headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

    address = await client.post('/api/v1/customer/addresses', headers=customer_headers, json=address_payload())
    assert address.status_code == 201
    address_id = address.json()['id']

    order_response = await client.post(
        '/api/v1/orders',
        headers=customer_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address_id,
            'payment_method_code': 'MERCADOPAGO',
            'notes': f'Nota {customer_email}',
        },
    )
    assert order_response.status_code == 201
    return customer_headers, order_response.json()['id']


async def fetch_history(order_id: int) -> list[OrderHistory]:
    async with get_session_factory()() as session:
        result = await session.execute(
            select(OrderHistory).where(OrderHistory.order_id == order_id).order_by(OrderHistory.created_at.asc(), OrderHistory.id.asc())
        )
        return list(result.scalars().all())


class ApprovedRedirectGateway:
    async def create_preference(self, *, external_reference: str, items: list[dict], back_urls: dict, notification_url: str):
        return MercadoPagoPreferenceResult(
            success=True,
            preference_id=f'redirect-pref-{external_reference}',
            init_point=f'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=redirect-pref-{external_reference}',
            sandbox_init_point=f'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=redirect-pref-{external_reference}',
        )

    async def get_payment_status(self, mp_payment_id: str):
        return MercadoPagoPaymentStatus(
            success=True,
            mp_payment_id=mp_payment_id,
            status='approved',
            status_detail='accredited',
            external_reference='order-1',
        )

    async def search_payment_by_external_reference(self, external_reference: str):
        return MercadoPagoPaymentStatus(
            success=True,
            mp_payment_id=f'mp-{external_reference}',
            status='approved',
            status_detail='accredited',
            external_reference=external_reference,
        )


@pytest.mark.asyncio
async def test_admin_user_role_updates_support_cocina(client):
    headers = await login_admin(client)
    created = await client.post(
        '/api/v1/admin/users',
        headers=headers,
        json={
            'first_name': 'Caro',
            'last_name': 'Cocina',
            'email': 'caro-cocina@test.local',
            'password': 'StrongPass123!',
            'role_codes': ['COCINA'],
        },
    )
    assert created.status_code == 201
    assert created.json()['roles'] == ['COCINA']

    updated = await client.put(
        f"/api/v1/admin/users/{created.json()['id']}/roles",
        headers=headers,
        json={'role_codes': ['CLIENT', 'COCINA']},
    )
    assert updated.status_code == 200
    assert set(updated.json()['roles']) == {'CLIENT', 'COCINA'}


@pytest.mark.asyncio
async def test_kitchen_queue_filters_orders_orders_oldest_first_and_enforces_roles(client):
    _, newer_order_id = await create_confirmed_order(client, customer_email='newer-kitchen@test.local')
    await asyncio.sleep(0.01)
    _, older_order_id = await create_confirmed_order(client, customer_email='older-kitchen@test.local')

    kitchen_user = await register_user(client, email='cocina-queue@test.local', first_name='Coco', last_name='Queue')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-queue@test.local', role_code='COCINA')
    kitchen_headers = {'Authorization': f"Bearer {kitchen_user.json()['access_token']}"}

    prep_transition = await client.post(
        f'/api/v1/admin/orders/{newer_order_id}/transition',
        headers=kitchen_headers,
        json={'to_state_code': 'EN_PREPARACION'},
    )
    assert prep_transition.status_code == 200

    admin_headers = await login_admin(client)

    _, pending_order_id = await create_pending_order(client, customer_email='pending-kitchen@test.local')
    _, en_camino_order_id = await create_confirmed_order(client, customer_email='en-camino-kitchen@test.local')
    to_preparation = await client.post(
        f'/api/v1/admin/orders/{en_camino_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'EN_PREPARACION'},
    )
    assert to_preparation.status_code == 200
    to_en_camino = await client.post(
        f'/api/v1/admin/orders/{en_camino_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'EN_CAMINO'},
    )
    assert to_en_camino.status_code == 200

    _, delivered_order_id = await create_confirmed_order(client, customer_email='entregado-kitchen@test.local')
    delivered_to_prep = await client.post(
        f'/api/v1/admin/orders/{delivered_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'EN_PREPARACION'},
    )
    assert delivered_to_prep.status_code == 200
    delivered_to_dispatch = await client.post(
        f'/api/v1/admin/orders/{delivered_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'EN_CAMINO'},
    )
    assert delivered_to_dispatch.status_code == 200
    to_delivered = await client.post(
        f'/api/v1/admin/orders/{delivered_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'ENTREGADO'},
    )
    assert to_delivered.status_code == 200

    _, cancelled_order_id = await create_confirmed_order(client, customer_email='cancelado-kitchen@test.local')
    to_cancelled = await client.post(
        f'/api/v1/admin/orders/{cancelled_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'CANCELADO'},
    )
    assert to_cancelled.status_code == 200

    queue = await client.get('/api/v1/cocina/pedidos', headers=kitchen_headers)
    assert queue.status_code == 200
    payload = queue.json()['items']
    assert [item['id'] for item in payload] == [newer_order_id, older_order_id]
    assert {item['state_code'] for item in payload} == {'CONFIRMADO', 'EN_PREPARACION'}
    visible_order_ids = {item['id'] for item in payload}
    assert pending_order_id not in visible_order_ids
    assert en_camino_order_id not in visible_order_ids
    assert delivered_order_id not in visible_order_ids
    assert cancelled_order_id not in visible_order_ids
    assert payload[0]['items'][0]['product_name']
    assert payload[0]['kitchen_entered_at']

    plain_user = await register_user(client, email='sin-cocina@test.local')
    assert plain_user.status_code == 201
    plain_headers = {'Authorization': f"Bearer {plain_user.json()['access_token']}"}
    forbidden = await client.get('/api/v1/cocina/pedidos', headers=plain_headers)
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_kitchen_transition_authorization_audit_and_events(client):
    kitchen_user = await register_user(client, email='cocina-fsm@test.local', first_name='Coco', last_name='FSM')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-fsm@test.local', role_code='COCINA')
    kitchen_headers = {'Authorization': f"Bearer {kitchen_user.json()['access_token']}"}

    _, order_id = await create_confirmed_order(client, customer_email='kitchen-fsm-order@test.local')

    forbidden_cancel = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=kitchen_headers,
        json={'to_state_code': 'CANCELADO'},
    )
    assert forbidden_cancel.status_code == 403
    assert forbidden_cancel.json()['code'] == 'ORDER_FORBIDDEN_TRANSITION'

    start_prep = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=kitchen_headers,
        json={'to_state_code': 'EN_PREPARACION', 'note': 'Arranca cocina'},
    )
    assert start_prep.status_code == 200
    assert start_prep.json()['order']['state_code'] == 'EN_PREPARACION'

    finish = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=kitchen_headers,
        json={'to_state_code': 'EN_CAMINO', 'note': 'Listo para despacho'},
    )
    assert finish.status_code == 200
    assert finish.json()['order']['state_code'] == 'EN_CAMINO'

    history = await fetch_history(order_id)
    kitchen_rows = [row for row in history if row.changed_by_user_id is not None and row.source == 'kitchen']
    assert len(kitchen_rows) == 2
    assert [row.actor_type for row in kitchen_rows] == ['kitchen', 'kitchen']
    assert [row.event_key for row in kitchen_rows] == [
        f'order:{order_id}:kitchen:EN_PREPARACION',
        f'order:{order_id}:kitchen:EN_CAMINO',
    ]


@pytest.mark.asyncio
async def test_kitchen_user_cannot_deliver_order_via_http_transition_endpoint(client):
    kitchen_user = await register_user(client, email='cocina-no-deliver@test.local', first_name='Coco', last_name='NoDeliver')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-no-deliver@test.local', role_code='COCINA')
    kitchen_headers = {'Authorization': f"Bearer {kitchen_user.json()['access_token']}"}

    _, order_id = await create_confirmed_order(client, customer_email='order-no-deliver@test.local')
    admin_headers = await login_admin(client)

    to_preparation = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'EN_PREPARACION'},
    )
    assert to_preparation.status_code == 200

    to_dispatch = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'EN_CAMINO'},
    )
    assert to_dispatch.status_code == 200

    forbidden_delivery = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=kitchen_headers,
        json={'to_state_code': 'ENTREGADO'},
    )
    assert forbidden_delivery.status_code == 403
    assert forbidden_delivery.json()['code'] == 'ORDER_FORBIDDEN_TRANSITION'


@pytest.mark.asyncio
async def test_kitchen_websocket_accepts_rejects_and_delivers_events(client, backend_env):
    import_models()
    session_factory = get_session_factory()
    engine = session_factory.kw['bind']
    async with engine.begin() as connection:
        await connection.run_sync(get_metadata().create_all)
    await seed_database()

    kitchen_user = await register_user(client, email='cocina-ws@test.local', first_name='Wanda', last_name='Socket')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-ws@test.local', role_code='COCINA')

    app = create_app()
    sync_client = TestClient(app)

    with pytest.raises(Exception):
        with sync_client.websocket_connect('/api/v1/cocina/ws'):
            pass

    plain_user = await register_user(client, email='plain-ws@test.local')
    assert plain_user.status_code == 201
    with pytest.raises(Exception):
        with sync_client.websocket_connect(f"/api/v1/cocina/ws?token={plain_user.json()['access_token']}"):
            pass

    with sync_client.websocket_connect(f"/api/v1/cocina/ws?token={kitchen_user.json()['access_token']}") as websocket:
        _, order_id = await create_confirmed_order(client, customer_email='ws-order@test.local')
        event = websocket.receive_json()
        assert event['type'] == 'PEDIDO_CONFIRMADO'
        assert event['order_id'] == order_id
        assert event['order']['state_code'] == 'CONFIRMADO'

        start_prep = await client.post(
            f'/api/v1/admin/orders/{order_id}/transition',
            headers={'Authorization': f"Bearer {kitchen_user.json()['access_token']}"},
            json={'to_state_code': 'EN_PREPARACION'},
        )
        assert start_prep.status_code == 200
        moved = websocket.receive_json()
        assert moved['type'] == 'PEDIDO_EN_PREPARACION'
        assert moved['order']['state_code'] == 'EN_PREPARACION'

    admin_headers = await login_admin(client)
    no_client_order_headers, no_client_order_id = await create_confirmed_order(client, customer_email='no-client-event@test.local')
    del no_client_order_headers
    cancel = await client.post(
        f'/api/v1/admin/orders/{no_client_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'CANCELADO'},
    )
    assert cancel.status_code == 200


@pytest.mark.asyncio
async def test_kitchen_websocket_rejects_missing_invalid_expired_and_unauthorized_tokens(client, backend_env):
    import_models()
    session_factory = get_session_factory()
    engine = session_factory.kw['bind']
    async with engine.begin() as connection:
        await connection.run_sync(get_metadata().create_all)
    await seed_database()

    kitchen_user = await register_user(client, email='cocina-expired-ws@test.local', first_name='Wanda', last_name='Expired')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-expired-ws@test.local', role_code='COCINA')

    plain_user = await register_user(client, email='plain-expired-ws@test.local')
    assert plain_user.status_code == 201

    async with get_session_factory()() as session:
        from app.modules.identity.model import User

        kitchen_model = (await session.execute(select(User).where(User.email == 'cocina-expired-ws@test.local'))).scalar_one()

    settings = get_settings()
    expired_token = jwt.encode(
        {
            'sub': str(kitchen_model.id),
            'email': kitchen_model.email,
            'roles': ['COCINA'],
            'exp': datetime.now(UTC) - timedelta(minutes=5),
        },
        settings.secret_key,
        algorithm='HS256',
    )

    sync_client = TestClient(create_app())

    with pytest.raises(Exception):
        with sync_client.websocket_connect('/api/v1/cocina/ws'):
            pass

    with pytest.raises(Exception):
        with sync_client.websocket_connect('/api/v1/cocina/ws?token=token-invalido'):
            pass

    with pytest.raises(Exception):
        with sync_client.websocket_connect(f"/api/v1/cocina/ws?token={plain_user.json()['access_token']}"):
            pass

    with pytest.raises(Exception):
        with sync_client.websocket_connect(f'/api/v1/cocina/ws?token={expired_token}'):
            pass


@pytest.mark.asyncio
async def test_kitchen_websocket_publishes_en_camino_after_preparation_finish(client, backend_env):
    import_models()
    session_factory = get_session_factory()
    engine = session_factory.kw['bind']
    async with engine.begin() as connection:
        await connection.run_sync(get_metadata().create_all)
    await seed_database()

    kitchen_user = await register_user(client, email='cocina-en-camino@test.local', first_name='Wanda', last_name='Finish')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-en-camino@test.local', role_code='COCINA')
    kitchen_headers = {'Authorization': f"Bearer {kitchen_user.json()['access_token']}"}

    sync_client = TestClient(create_app())

    with sync_client.websocket_connect(f"/api/v1/cocina/ws?token={kitchen_user.json()['access_token']}") as websocket:
        _, order_id = await create_confirmed_order(client, customer_email='en-camino-order@test.local')
        websocket.receive_json()

        start_prep = await client.post(
            f'/api/v1/admin/orders/{order_id}/transition',
            headers=kitchen_headers,
            json={'to_state_code': 'EN_PREPARACION'},
        )
        assert start_prep.status_code == 200
        websocket.receive_json()

        finish = await client.post(
            f'/api/v1/admin/orders/{order_id}/transition',
            headers=kitchen_headers,
            json={'to_state_code': 'EN_CAMINO'},
        )
        assert finish.status_code == 200

        event = websocket.receive_json()
        assert event['type'] == 'PEDIDO_EN_CAMINO'
        assert event['order_id'] == order_id
        assert event['order'] is None


@pytest.mark.asyncio
async def test_kitchen_websocket_publishes_cancelled_event_for_kitchen_phase_orders(client, backend_env):
    import_models()
    session_factory = get_session_factory()
    engine = session_factory.kw['bind']
    async with engine.begin() as connection:
        await connection.run_sync(get_metadata().create_all)
    await seed_database()

    kitchen_user = await register_user(client, email='cocina-cancelled@test.local', first_name='Wanda', last_name='Cancel')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-cancelled@test.local', role_code='COCINA')
    kitchen_headers = {'Authorization': f"Bearer {kitchen_user.json()['access_token']}"}
    admin_headers = await login_admin(client)

    sync_client = TestClient(create_app())

    with sync_client.websocket_connect(f"/api/v1/cocina/ws?token={kitchen_user.json()['access_token']}") as websocket:
        _, order_id = await create_confirmed_order(client, customer_email='cancelled-order@test.local')
        websocket.receive_json()

        start_prep = await client.post(
            f'/api/v1/admin/orders/{order_id}/transition',
            headers=kitchen_headers,
            json={'to_state_code': 'EN_PREPARACION'},
        )
        assert start_prep.status_code == 200
        websocket.receive_json()

        cancel = await client.post(
            f'/api/v1/admin/orders/{order_id}/transition',
            headers=admin_headers,
            json={'to_state_code': 'CANCELADO'},
        )
        assert cancel.status_code == 200

        event = websocket.receive_json()
        assert event['type'] == 'PEDIDO_CANCELADO'
        assert event['order_id'] == order_id
        assert event['order'] is None


@pytest.mark.asyncio
async def test_payment_confirmation_records_system_audit_and_publishes_confirmed_kitchen_event(client, backend_env):
    import_models()
    session_factory = get_session_factory()
    engine = session_factory.kw['bind']
    async with engine.begin() as connection:
        await connection.run_sync(get_metadata().create_all)
    await seed_database()

    original_gateway = payment_service._gateway
    payment_service._gateway = ApprovedRedirectGateway()

    kitchen_user = await register_user(client, email='cocina-payment-ws@test.local', first_name='Wanda', last_name='Payment')
    assert kitchen_user.status_code == 201
    await assign_role(email='cocina-payment-ws@test.local', role_code='COCINA')

    try:
        sync_client = TestClient(create_app())
        with sync_client.websocket_connect(f"/api/v1/cocina/ws?token={kitchen_user.json()['access_token']}") as websocket:
            admin_headers = await login_admin(client)
            product = await create_product(client, admin_headers, name='Pizza Payment', stock=5, price='30.00')

            customer = await register_user(client, email='payment-ws-customer@test.local')
            assert customer.status_code == 201
            customer_headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

            address = await client.post('/api/v1/customer/addresses', headers=customer_headers, json=address_payload())
            assert address.status_code == 201

            order = await client.post(
                '/api/v1/orders',
                headers=customer_headers,
                json={
                    'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
                    'delivery_address_id': address.json()['id'],
                    'payment_method_code': 'MERCADOPAGO',
                },
            )
            assert order.status_code == 201
            order_id = order.json()['id']

            payment_response = await client.post('/api/v1/payments/init', headers=customer_headers, json={'order_id': order_id})
            assert payment_response.status_code == 201

            result_response = await client.get(f'/api/v1/payments/result/order-{order_id}', headers=customer_headers)
            assert result_response.status_code == 200

            event = websocket.receive_json()
            assert event['type'] == 'PEDIDO_CONFIRMADO'
            assert event['order_id'] == order_id
            assert event['order']['state_code'] == 'CONFIRMADO'

            history = await fetch_history(order_id)
            payment_rows = [row for row in history if row.event_key == f'mp:mp-order-{order_id}:approved']
            assert len(payment_rows) == 1
            assert payment_rows[0].actor_type == 'system'
            assert payment_rows[0].changed_by_user_id is None
            assert payment_rows[0].source == 'payment'
            assert payment_rows[0].reason_code == 'payment_approved'
            assert f'MP payment: mp-order-{order_id}' in payment_rows[0].note
    finally:
        payment_service._gateway = original_gateway
