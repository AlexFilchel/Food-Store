"""End-to-end integration test for checkout -> order -> payment flow."""

import pytest
from sqlalchemy import select

from app.core.database import get_session_factory
from app.modules.orders.model import Order, OrderHistory
from app.modules.payments.gateway import MercadoPagoPaymentStatus, MercadoPagoPreferenceResult
from app.modules.payments.model import Payment, PaymentEvent
from app.modules.payments.service import payment_service
from app.modules.products.model import Product


async def register_user(client, *, email: str):
    response = await client.post(
        '/api/v1/auth/register',
        json={
            'first_name': 'Ada',
            'last_name': 'Lovelace',
            'email': email,
            'password': 'StrongPass123!',
        },
    )
    return response


async def login_admin(client):
    response = await client.post('/api/v1/auth/login', json={'email': 'admin@test.local', 'password': 'Admin1234!'})
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


async def assign_role(*, email: str, role_code: str) -> None:
    async with get_session_factory()() as session:
        from app.modules.identity.model import Role, User, UserRole

        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        role = (await session.execute(select(Role).where(Role.code == role_code))).scalar_one()
        existing = await session.execute(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        )
        if existing.scalar_one_or_none() is None:
            session.add(UserRole(user_id=user.id, role_id=role.id))
        await session.commit()


class RedirectFallbackGateway:
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


class StatusGateway(RedirectFallbackGateway):
    def __init__(self, *, status: str):
        self._status = status

    async def get_payment_status(self, mp_payment_id: str):
        return MercadoPagoPaymentStatus(
            success=True,
            mp_payment_id=mp_payment_id,
            status=self._status,
            status_detail=self._status,
            external_reference='order-1',
        )

    async def search_payment_by_external_reference(self, external_reference: str):
        return MercadoPagoPaymentStatus(
            success=True,
            mp_payment_id=f'mp-{external_reference}',
            status=self._status,
            status_detail=self._status,
            external_reference=external_reference,
        )


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


async def fetch_order_history(order_id: int) -> list[OrderHistory]:
    async with get_session_factory()() as session:
        result = await session.execute(
            select(OrderHistory)
            .where(OrderHistory.order_id == order_id)
            .order_by(OrderHistory.created_at.asc(), OrderHistory.id.asc())
        )
        return list(result.scalars().all())


async def fetch_order_state_id(order_id: int) -> int:
    async with get_session_factory()() as session:
        order = await session.get(Order, order_id)
        assert order is not None
        return order.state_id


async def fetch_product_stock(product_id: int) -> int:
    async with get_session_factory()() as session:
        product = await session.get(Product, product_id)
        assert product is not None
        return product.stock_quantity


async def fetch_payment(payment_id: int) -> Payment:
    async with get_session_factory()() as session:
        payment = await session.get(Payment, payment_id)
        assert payment is not None
        return payment


async def count_payment_events(payment_id: int) -> int:
    async with get_session_factory()() as session:
        result = await session.execute(select(PaymentEvent).where(PaymentEvent.payment_id == payment_id))
        return len(result.scalars().all())


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


@pytest.mark.asyncio
async def test_full_checkout_to_order_to_payment_flow(client):
    """Happy path: register -> add address -> create order -> init payment."""
    # setup: admin creates product
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Burger Deluxe', stock=10, price='25.00')

    # setup: customer registers and adds address
    customer = await register_user(client, email='e2e-customer@example.com')
    assert customer.status_code == 201
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

    address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
    assert address.status_code == 201
    address_id = address.json()['id']

    # step 1: create order
    order_response = await client.post(
        '/api/v1/orders',
        headers=headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 2, 'removed_ingredient_ids': []}],
            'delivery_address_id': address_id,
            'payment_method_code': 'MERCADOPAGO',
        },
    )
    assert order_response.status_code == 201
    order = order_response.json()
    assert order['state'] == 'Pendiente'
    assert order['subtotal'] == '50.00'
    assert order['order_number'].startswith('ORD-')
    order_id = order['id']

    # step 2: init payment
    payment_response = await client.post(
        '/api/v1/payments/init',
        headers=headers,
        json={'order_id': order_id},
    )
    assert payment_response.status_code == 201
    payment = payment_response.json()
    assert payment['preference_id'].startswith('mock-pref-')
    assert 'mercadopago' in payment['init_point']
    assert payment['external_reference'] == f'order-{order_id}'
    payment_id = payment['payment_id']

    # step 3: get payment status
    status_response = await client.get(f'/api/v1/payments/{payment_id}/status', headers=headers)
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert status_data['status'] == 'Pendiente'
    assert status_data['amount'] == '50.00'

    # step 4: get payment by order
    by_order_response = await client.get(f'/api/v1/payments/by-order/{order_id}', headers=headers)
    assert by_order_response.status_code == 200
    assert by_order_response.json()['payment_id'] == payment_id


@pytest.mark.asyncio
async def test_payment_result_redirect_can_reconcile_without_webhook(client):
    original_gateway = payment_service._gateway
    payment_service._gateway = RedirectFallbackGateway()

    try:
        admin_headers = await login_admin(client)
        product = await create_product(client, admin_headers, name='Napolitana', stock=5, price='30.00')

        customer = await register_user(client, email='redirect-fallback@example.com')
        headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
        address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
        assert address.status_code == 201

        order = await client.post(
            '/api/v1/orders',
            headers=headers,
            json={
                'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
                'delivery_address_id': address.json()['id'],
                'payment_method_code': 'MERCADOPAGO',
            },
        )
        assert order.status_code == 201
        order_id = order.json()['id']

        payment_response = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_id})
        assert payment_response.status_code == 201
        payment_data = payment_response.json()
        assert payment_data['external_reference'] == f'order-{order_id}'

        result_response = await client.get(f'/api/v1/payments/result/order-{order_id}', headers=headers)
        assert result_response.status_code == 200
        result_data = result_response.json()
        assert result_data['status'] == 'Aprobado'
        assert result_data['mp_payment_id'] == f'mp-order-{order_id}'

        by_order_response = await client.get(f'/api/v1/payments/by-order/{order_id}', headers=headers)
        assert by_order_response.status_code == 200
        assert by_order_response.json()['status'] == 'Aprobado'

        detail_response = await client.get(f'/api/v1/orders/{order_id}', headers=headers)
        assert detail_response.status_code == 200
        assert detail_response.json()['state'] == 'Confirmado'

        history_rows = await fetch_order_history(order_id)
        payment_history = [row for row in history_rows if row.event_key == f'mp:mp-{payment_data["external_reference"]}:approved']
        assert len(payment_history) == 1
        assert payment_history[0].actor_type == 'system'
        assert payment_history[0].changed_by_user_id is None
        assert payment_history[0].source == 'payment'
        assert payment_history[0].reason_code == 'payment_approved'
        assert f'MP payment: mp-order-{order_id}' in payment_history[0].note
    finally:
        payment_service._gateway = original_gateway


@pytest.mark.asyncio
async def test_customer_order_history_filter_and_payment_result_ownership(client):
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Tracking Burger', stock=20, price='22.00')

    owner = await register_user(client, email='tracking-owner@example.com')
    owner_headers = {'Authorization': f"Bearer {owner.json()['access_token']}"}
    owner_address = await client.post('/api/v1/customer/addresses', headers=owner_headers, json=address_payload())
    assert owner_address.status_code == 201

    outsider = await register_user(client, email='tracking-outsider@example.com')
    outsider_headers = {'Authorization': f"Bearer {outsider.json()['access_token']}"}
    outsider_address = await client.post('/api/v1/customer/addresses', headers=outsider_headers, json=address_payload(street='Otra calle'))
    assert outsider_address.status_code == 201

    owner_order = await client.post(
        '/api/v1/orders',
        headers=owner_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': owner_address.json()['id'],
            'payment_method_code': 'MERCADOPAGO',
        },
    )
    assert owner_order.status_code == 201
    owner_order_id = owner_order.json()['id']

    owner_confirmed_order = await client.post(
        '/api/v1/orders',
        headers=owner_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': owner_address.json()['id'],
            'payment_method_code': 'MERCADOPAGO',
        },
    )
    assert owner_confirmed_order.status_code == 201
    owner_confirmed_order_id = owner_confirmed_order.json()['id']
    confirmed_transition = await client.post(
        f'/api/v1/admin/orders/{owner_confirmed_order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'CONFIRMADO'},
    )
    assert confirmed_transition.status_code == 200

    outsider_order = await client.post(
        '/api/v1/orders',
        headers=outsider_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': outsider_address.json()['id'],
            'payment_method_code': 'MERCADOPAGO',
        },
    )
    assert outsider_order.status_code == 201

    owner_payment = await client.post('/api/v1/payments/init', headers=owner_headers, json={'order_id': owner_order_id})
    assert owner_payment.status_code == 201
    external_reference = owner_payment.json()['external_reference']

    owner_list = await client.get('/api/v1/orders?skip=0&limit=10', headers=owner_headers)
    assert owner_list.status_code == 200
    owner_list_data = owner_list.json()
    assert owner_list_data['total'] == 2
    assert owner_list_data['skip'] == 0
    assert owner_list_data['limit'] == 10
    assert [order['id'] for order in owner_list_data['items']] == [owner_confirmed_order_id, owner_order_id]

    filtered_list = await client.get('/api/v1/orders?state_code=CONFIRMADO&skip=0&limit=10', headers=owner_headers)
    assert filtered_list.status_code == 200
    filtered_list_data = filtered_list.json()
    assert filtered_list_data['total'] == 1
    assert len(filtered_list_data['items']) == 1
    assert filtered_list_data['items'][0]['id'] == owner_confirmed_order_id
    assert filtered_list_data['items'][0]['state'] == 'Confirmado'

    owner_detail = await client.get(f'/api/v1/orders/{owner_order_id}', headers=owner_headers)
    assert owner_detail.status_code == 200
    assert owner_detail.json()['payment']['retry_allowed'] is True
    assert len(owner_detail.json()['history']) >= 1

    outsider_detail = await client.get(f'/api/v1/orders/{owner_order_id}', headers=outsider_headers)
    assert outsider_detail.status_code == 404

    owner_result = await client.get(f'/api/v1/payments/result/{external_reference}', headers=owner_headers)
    assert owner_result.status_code == 200

    outsider_result = await client.get(f'/api/v1/payments/result/{external_reference}', headers=outsider_headers)
    assert outsider_result.status_code == 404


@pytest.mark.asyncio
async def test_payment_idempotency_returns_existing_preference(client):
    """Calling /payments/init twice for same order returns same preference."""
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Pizza Margherita', stock=5, price='30.00')

    customer = await register_user(client, email='idempotency@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

    order = await client.post(
        '/api/v1/orders',
        headers=headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address.json()['id'],
        },
    )
    order_id = order.json()['id']

    # first init
    payment1 = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_id})
    assert payment1.status_code == 201

    # second init - should return same preference
    payment2 = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_id})
    assert payment2.status_code == 201
    assert payment2.json()['preference_id'] == payment1.json()['preference_id']
    assert payment2.json()['payment_id'] == payment1.json()['payment_id']


@pytest.mark.asyncio
async def test_payment_rejects_order_not_owned(client):
    """Cannot init payment for another user's order."""
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Empanada', stock=10, price='10.00')

    owner = await register_user(client, email='owner@example.com')
    owner_headers = {'Authorization': f"Bearer {owner.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=owner_headers, json=address_payload())

    order = await client.post(
        '/api/v1/orders',
        headers=owner_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address.json()['id'],
        },
    )
    order_id = order.json()['id']

    # other user tries to pay
    other = await register_user(client, email='other@example.com')
    other_headers = {'Authorization': f"Bearer {other.json()['access_token']}"}

    response = await client.post('/api/v1/payments/init', headers=other_headers, json={'order_id': order_id})
    assert response.status_code == 403
    assert response.json()['code'] == 'PAYMENT_ORDER_NOT_OWNED'


@pytest.mark.asyncio
async def test_payment_rejects_nonexistent_order(client):
    """Cannot init payment for non-existent order."""
    customer = await register_user(client, email='noorder@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

    response = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': 99999})
    assert response.status_code == 404
    assert response.json()['code'] == 'PAYMENT_ORDER_NOT_FOUND'


@pytest.mark.asyncio
async def test_payment_returns_401_without_auth(client):
    """Cannot init payment without authentication."""
    response = await client.post('/api/v1/payments/init', json={'order_id': 1})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_order_stock_decrement(client):
    """Creating an order decrements stock atomically."""
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Lomito', stock=5, price='15.00')

    customer = await register_user(client, email='stock@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

    # create order with quantity 3
    order = await client.post(
        '/api/v1/orders',
        headers=headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 3, 'removed_ingredient_ids': []}],
            'delivery_address_id': address.json()['id'],
        },
    )
    assert order.status_code == 201

    # verify stock decremented
    async with get_session_factory()() as session:
        from app.modules.products.model import Product
        stored = await session.get(Product, product['id'])
        assert stored.stock_quantity == 2


@pytest.mark.asyncio
async def test_order_rejects_insufficient_stock(client):
    """Cannot create order with more quantity than available stock."""
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Choripán', stock=2, price='8.00')

    customer = await register_user(client, email='nostock@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

    response = await client.post(
        '/api/v1/orders',
        headers=headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 5, 'removed_ingredient_ids': []}],
            'delivery_address_id': address.json()['id'],
        },
    )
    assert response.status_code == 409
    assert response.json()['code'] == 'ORDER_INSUFFICIENT_STOCK'


@pytest.mark.asyncio
async def test_order_rejects_empty_items(client):
    """Cannot create order with no items."""
    customer = await register_user(client, email='empty@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

    response = await client.post(
        '/api/v1/orders',
        headers=headers,
        json={'items': []},
    )
    # FastAPI returns 422 for Pydantic validation error (min_length=1)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_order_rejects_missing_address(client):
    """Cannot create order without delivery address when no default exists."""
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Milanesa', stock=10, price='12.00')

    customer = await register_user(client, email='noaddress@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

    response = await client.post(
        '/api/v1/orders',
        headers=headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
        },
    )
    assert response.status_code == 400
    assert response.json()['code'] == 'ORDER_DELIVERY_ADDRESS_REQUIRED'


@pytest.mark.asyncio
async def test_order_list_and_detail(client):
    """Can list orders and get order detail."""
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Bondiola', stock=10, price='18.00')

    customer = await register_user(client, email='list@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

    # create order
    order = await client.post(
        '/api/v1/orders',
        headers=headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address.json()['id'],
        },
    )
    order_id = order.json()['id']
    order_number = order.json()['order_number']

    # list orders
    orders_list = await client.get('/api/v1/orders', headers=headers)
    assert orders_list.status_code == 200
    orders_page = orders_list.json()
    assert orders_page['total'] >= 1
    assert orders_page['skip'] == 0
    assert orders_page['limit'] == 20
    assert any(o['order_number'] == order_number for o in orders_page['items'])

    # get detail
    detail = await client.get(f'/api/v1/orders/{order_id}', headers=headers)
    assert detail.status_code == 200
    assert detail.json()['order_number'] == order_number
    assert detail.json()['state'] == 'Pendiente'
    assert len(detail.json()['items']) == 1
    assert detail.json()['delivery_address']['recipient_name'] == 'Ada Lovelace'


@pytest.mark.asyncio
async def test_webhook_endpoint_returns_200(client):
    """Webhook endpoint always returns 200 OK."""
    response = await client.post(
        '/api/v1/payments/webhook',
        json={'type': 'payment', 'data': {'id': '12345'}},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_webhook_ignores_non_payment_type(client):
    """Webhook ignores non-payment event types."""
    response = await client.post(
        '/api/v1/payments/webhook',
        json={'type': 'merchant_order', 'data': {'id': '12345'}},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_customer_can_cancel_own_pending_order_and_restore_stock(client):
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Cancelable', stock=7, price='10.00')
    customer = await register_user(client, email='cancel-owner@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

    order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 2, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id']})
    order_id = order.json()['id']
    cancel = await client.post(f'/api/v1/orders/{order_id}/cancel', headers=headers, json={'reason_code': 'customer_request'})
    assert cancel.status_code == 200
    assert cancel.json()['state'] == 'Cancelado'

    repeated_cancel = await client.post(f'/api/v1/orders/{order_id}/cancel', headers=headers, json={'reason_code': 'customer_request'})
    assert repeated_cancel.status_code == 200
    assert repeated_cancel.json()['state'] == 'Cancelado'

    assert await fetch_product_stock(product['id']) == 7
    history_rows = await fetch_order_history(order_id)
    assert len(history_rows) == 2
    cancel_history = history_rows[-1]
    assert cancel_history.changed_by_user_id == customer.json()['user']['id']
    assert cancel_history.actor_type == 'customer'
    assert cancel_history.source == 'api'
    assert cancel_history.reason_code == 'customer_request'
    assert cancel_history.event_key == f'order:{order_id}:customer-cancel'


@pytest.mark.asyncio
async def test_customer_cannot_cancel_other_customer_order(client):
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Protected', stock=5, price='12.00')
    owner = await register_user(client, email='owner-cancel@example.com')
    owner_headers = {'Authorization': f"Bearer {owner.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=owner_headers, json=address_payload())
    order = await client.post('/api/v1/orders', headers=owner_headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id']})
    order_id = order.json()['id']

    other = await register_user(client, email='other-cancel@example.com')
    other_headers = {'Authorization': f"Bearer {other.json()['access_token']}"}
    deny = await client.post(f'/api/v1/orders/{order_id}/cancel', headers=other_headers, json={'reason_code': 'hack'})
    assert deny.status_code == 403

    history_rows = await fetch_order_history(order_id)
    assert len(history_rows) == 1


@pytest.mark.asyncio
async def test_admin_transition_flow_and_invalid_transition_has_no_history(client):
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='OpsFlow', stock=10, price='11.00')
    customer = await register_user(client, email='ops-customer@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
    order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id']})
    order_id = order.json()['id']
    initial_history_count = len(await fetch_order_history(order_id))
    initial_state_id = await fetch_order_state_id(order_id)

    # invalid PENDIENTE -> ENTREGADO
    invalid = await client.post(f'/api/v1/admin/orders/{order_id}/transition', headers=admin_headers, json={'to_state_code': 'ENTREGADO'})
    assert invalid.status_code == 409
    assert await fetch_order_state_id(order_id) == initial_state_id
    assert len(await fetch_order_history(order_id)) == initial_history_count

    # valid progression
    expected_history_count = initial_history_count
    for state in ['CONFIRMADO', 'EN_PREPARACION', 'EN_CAMINO', 'ENTREGADO']:
        ok = await client.post(f'/api/v1/admin/orders/{order_id}/transition', headers=admin_headers, json={'to_state_code': state})
        assert ok.status_code == 200
        expected_history_count += 1
        history_rows = await fetch_order_history(order_id)
        assert len(history_rows) == expected_history_count
        assert history_rows[-1].actor_type == 'admin'
        assert history_rows[-1].source == 'admin_api'
        assert history_rows[-1].event_key == f'order:{order_id}:admin:{state}'

    terminal_invalid = await client.post(f'/api/v1/admin/orders/{order_id}/transition', headers=admin_headers, json={'to_state_code': 'CANCELADO'})
    assert terminal_invalid.status_code == 409
    assert len(await fetch_order_history(order_id)) == expected_history_count


@pytest.mark.asyncio
async def test_operations_orders_access_and_filters(client):
    admin_headers = await login_admin(client)
    pedidos_user = await register_user(client, email='ops-manager@example.com')
    await assign_role(email='ops-manager@example.com', role_code='PEDIDOS')
    pedidos_headers = {'Authorization': f"Bearer {pedidos_user.json()['access_token']}"}

    customer = await register_user(client, email='ops-customer@example.com')
    customer_headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}

    product = await create_product(client, admin_headers, name='Ops Filter', stock=6, price='19.00')
    address = await client.post('/api/v1/customer/addresses', headers=customer_headers, json=address_payload())
    order = await client.post(
        '/api/v1/orders',
        headers=customer_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': address.json()['id'],
            'payment_method_code': 'MERCADOPAGO',
        },
    )
    order_id = order.json()['id']

    list_response = await client.get('/api/v1/admin/orders?skip=0&limit=5', headers=admin_headers)
    assert list_response.status_code == 200
    assert list_response.json()['total'] >= 1

    pedidos_list = await client.get('/api/v1/admin/orders?skip=0&limit=5', headers=pedidos_headers)
    assert pedidos_list.status_code == 200

    forbidden_list = await client.get('/api/v1/admin/orders?skip=0&limit=5', headers=customer_headers)
    assert forbidden_list.status_code == 403

    anon_list = await client.get('/api/v1/admin/orders?skip=0&limit=5')
    assert anon_list.status_code == 401

    filtered_list = await client.get('/api/v1/admin/orders?state_code=PENDIENTE&skip=0&limit=5', headers=admin_headers)
    assert filtered_list.status_code == 200
    assert any(item['id'] == order_id for item in filtered_list.json()['items'])

    detail = await client.get(f'/api/v1/admin/orders/{order_id}', headers=admin_headers)
    assert detail.status_code == 200
    detail_payload = detail.json()
    assert detail_payload['order']['id'] == order_id
    assert detail_payload['customer']['email'] == 'ops-customer@example.com'
    assert len(detail_payload['history']) >= 1

    missing_detail = await client.get('/api/v1/admin/orders/999999', headers=admin_headers)
    assert missing_detail.status_code == 404

    history_before = await fetch_order_history(order_id)
    detail_again = await client.get(f'/api/v1/admin/orders/{order_id}', headers=admin_headers)
    assert detail_again.status_code == 200
    history_after = await fetch_order_history(order_id)
    assert len(history_after) == len(history_before)


@pytest.mark.asyncio
async def test_operations_transition_rules_and_side_effects(client):
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Ops Transition', stock=5, price='13.00')
    customer = await register_user(client, email='ops-transition@example.com')
    customer_headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    address = await client.post('/api/v1/customer/addresses', headers=customer_headers, json=address_payload())
    order = await client.post(
        '/api/v1/orders',
        headers=customer_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 2, 'removed_ingredient_ids': []}],
            'delivery_address_id': address.json()['id'],
        },
    )
    order_id = order.json()['id']

    ok_transition = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'CONFIRMADO'},
    )
    assert ok_transition.status_code == 200
    assert ok_transition.json()['order']['state_code'] == 'CONFIRMADO'

    invalid_transition = await client.post(
        f'/api/v1/admin/orders/{order_id}/transition',
        headers=admin_headers,
        json={'to_state_code': 'ENTREGADO'},
    )
    assert invalid_transition.status_code == 409
    assert invalid_transition.json()['code'] == 'ORDER_OPERATION_NOT_ALLOWED'

    history_rows = await fetch_order_history(order_id)
    assert history_rows[-1].actor_type == 'admin'
    assert history_rows[-1].source == 'operations'
    assert history_rows[-1].event_key == f'order:{order_id}:operations:CONFIRMADO'
    assert len(history_rows) >= 2

    assert await fetch_product_stock(product['id']) == 3


@pytest.mark.asyncio
async def test_payment_statuses_follow_fsm_rules(client):
    original_gateway = payment_service._gateway
    try:
        # rejected keeps pending
        payment_service._gateway = StatusGateway(status='rejected')
        admin_headers = await login_admin(client)
        product = await create_product(client, admin_headers, name='RejectedPay', stock=3, price='9.00')
        customer = await register_user(client, email='rejected-pay@example.com')
        headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
        address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
        order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id'], 'payment_method_code': 'MERCADOPAGO'})
        order_id = order.json()['id']
        pay = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_id})
        payment_id = pay.json()['payment_id']
        await client.get(f'/api/v1/payments/{payment_id}/status', headers=headers)
        detail = await client.get(f'/api/v1/orders/{order_id}', headers=headers)
        assert detail.json()['state'] == 'Pendiente'

        # cancelled transitions pending -> cancelado (fresh order/payment)
        payment_service._gateway = StatusGateway(status='cancelled')
        order_c = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id'], 'payment_method_code': 'MERCADOPAGO'})
        order_c_id = order_c.json()['id']
        pay_c = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_c_id})
        payment_c_id = pay_c.json()['payment_id']
        await client.get(f'/api/v1/payments/{payment_c_id}/status', headers=headers)
        detail2 = await client.get(f'/api/v1/orders/{order_c_id}', headers=headers)
        assert detail2.json()['state'] == 'Cancelado'
    finally:
        payment_service._gateway = original_gateway


@pytest.mark.asyncio
async def test_duplicate_approval_event_is_idempotent_for_order_transition(client):
    original_gateway = payment_service._gateway
    payment_service._gateway = StatusGateway(status='approved')

    try:
        admin_headers = await login_admin(client)
        product = await create_product(client, admin_headers, name='DuplicateApproval', stock=4, price='14.00')
        customer = await register_user(client, email='duplicate-approval@example.com')
        headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
        address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
        order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id'], 'payment_method_code': 'MERCADOPAGO'})
        order_id = order.json()['id']
        payment_response = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_id})
        payment_id = payment_response.json()['payment_id']

        first_status = await client.get(f'/api/v1/payments/{payment_id}/status', headers=headers)
        assert first_status.status_code == 200
        assert first_status.json()['status'] == 'Aprobado'
        history_after_first = await fetch_order_history(order_id)
        assert len([row for row in history_after_first if row.source == 'payment']) == 1
        assert await fetch_product_stock(product['id']) == 3

        mp_payment_id = (await fetch_payment(payment_id)).mp_payment_id
        assert mp_payment_id is not None
        duplicate_webhook = await client.post('/api/v1/payments/webhook', json={'type': 'payment', 'data': {'id': mp_payment_id}})
        assert duplicate_webhook.status_code == 200

        history_after_duplicate = await fetch_order_history(order_id)
        assert len(history_after_duplicate) == len(history_after_first)
        assert len([row for row in history_after_duplicate if row.event_key == f'mp:{mp_payment_id}:approved']) == 1
        assert await fetch_product_stock(product['id']) == 3
        assert await count_payment_events(payment_id) >= 2
    finally:
        payment_service._gateway = original_gateway


@pytest.mark.asyncio
async def test_late_rejected_event_after_confirmation_does_not_change_order_or_history(client):
    original_gateway = payment_service._gateway
    gateway = StatusGateway(status='approved')
    payment_service._gateway = gateway

    try:
        admin_headers = await login_admin(client)
        product = await create_product(client, admin_headers, name='LateRejected', stock=3, price='12.00')
        customer = await register_user(client, email='late-rejected@example.com')
        headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
        address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
        order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id'], 'payment_method_code': 'MERCADOPAGO'})
        order_id = order.json()['id']
        payment_response = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_id})
        payment_id = payment_response.json()['payment_id']
        approved = await client.get(f'/api/v1/payments/{payment_id}/status', headers=headers)
        assert approved.json()['status'] == 'Aprobado'
        history_after_approval = await fetch_order_history(order_id)
        mp_payment_id = (await fetch_payment(payment_id)).mp_payment_id
        assert mp_payment_id is not None

        gateway._status = 'rejected'
        late_rejected = await client.post('/api/v1/payments/webhook', json={'type': 'payment', 'data': {'id': mp_payment_id}})
        assert late_rejected.status_code == 200

        detail = await client.get(f'/api/v1/orders/{order_id}', headers=headers)
        assert detail.json()['state'] == 'Confirmado'
        assert len(await fetch_order_history(order_id)) == len(history_after_approval)
        rejected_payment = await fetch_payment(payment_id)
        assert rejected_payment.failure_reason == 'MercadoPago status: rejected'
    finally:
        payment_service._gateway = original_gateway


@pytest.mark.asyncio
async def test_approval_for_cancelled_order_is_ignored_but_payment_event_is_processed(client):
    original_gateway = payment_service._gateway
    payment_service._gateway = StatusGateway(status='approved')

    try:
        admin_headers = await login_admin(client)
        product = await create_product(client, admin_headers, name='CancelledApproval', stock=3, price='10.00')
        customer = await register_user(client, email='approval-cancelled@example.com')
        headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
        address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
        order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id'], 'payment_method_code': 'MERCADOPAGO'})
        order_id = order.json()['id']
        payment_response = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': order_id})
        payment_id = payment_response.json()['payment_id']
        cancel = await client.post(f'/api/v1/orders/{order_id}/cancel', headers=headers, json={'reason_code': 'customer_request'})
        assert cancel.status_code == 200
        history_after_cancel = await fetch_order_history(order_id)

        webhook = await client.post('/api/v1/payments/webhook', json={'type': 'payment', 'data': {'id': 'mp-cancelled-approval', 'external_reference': f'order-{order_id}'}})
        assert webhook.status_code == 200

        detail = await client.get(f'/api/v1/orders/{order_id}', headers=headers)
        assert detail.json()['state'] == 'Cancelado'
        assert len(await fetch_order_history(order_id)) == len(history_after_cancel)
        assert (await fetch_payment(payment_id)).mp_payment_id == 'mp-cancelled-approval'
        assert await count_payment_events(payment_id) >= 2
    finally:
        payment_service._gateway = original_gateway


@pytest.mark.asyncio
async def test_retry_allowed_after_rejected_payment_and_blocked_after_cancellation(client):
    original_gateway = payment_service._gateway
    try:
        payment_service._gateway = StatusGateway(status='rejected')
        admin_headers = await login_admin(client)
        product = await create_product(client, admin_headers, name='RetryRules', stock=4, price='9.00')
        customer = await register_user(client, email='retry-rules@example.com')
        headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
        address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

        rejected_order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id'], 'payment_method_code': 'MERCADOPAGO'})
        rejected_order_id = rejected_order.json()['id']
        rejected_payment_response = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': rejected_order_id})
        rejected_payment_id = rejected_payment_response.json()['payment_id']
        rejected_status = await client.get(f'/api/v1/payments/{rejected_payment_id}/status', headers=headers)
        assert rejected_status.json()['status'] == 'Rechazado'
        assert (await client.get(f'/api/v1/orders/{rejected_order_id}', headers=headers)).json()['state'] == 'Pendiente'
        assert await fetch_product_stock(product['id']) == 3

        retry = await client.post(f'/api/v1/payments/{rejected_payment_id}/retry', headers=headers)
        assert retry.status_code == 200
        assert retry.json()['payment_id'] == rejected_payment_id
        assert retry.json()['attempts'] == 2

        payment_service._gateway = StatusGateway(status='cancelled')
        cancelled_order = await client.post('/api/v1/orders', headers=headers, json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}], 'delivery_address_id': address.json()['id'], 'payment_method_code': 'MERCADOPAGO'})
        cancelled_order_id = cancelled_order.json()['id']
        cancelled_payment_response = await client.post('/api/v1/payments/init', headers=headers, json={'order_id': cancelled_order_id})
        cancelled_payment_id = cancelled_payment_response.json()['payment_id']
        cancelled_status = await client.get(f'/api/v1/payments/{cancelled_payment_id}/status', headers=headers)
        assert cancelled_status.json()['status'] == 'Cancelado'
        assert (await client.get(f'/api/v1/orders/{cancelled_order_id}', headers=headers)).json()['state'] == 'Cancelado'

        blocked_retry = await client.post(f'/api/v1/payments/{cancelled_payment_id}/retry', headers=headers)
        assert blocked_retry.status_code == 409
        assert blocked_retry.json()['code'] == 'PAYMENT_ORDER_NOT_PENDING'
    finally:
        payment_service._gateway = original_gateway
