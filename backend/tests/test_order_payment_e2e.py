"""End-to-end integration test for checkout -> order -> payment flow."""

import pytest

from app.core.database import get_session_factory
from app.modules.payments.gateway import MercadoPagoPaymentStatus, MercadoPagoPreferenceResult
from app.modules.payments.service import payment_service


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

        result_response = await client.get(f'/api/v1/payments/result/order-{order_id}')
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
    finally:
        payment_service._gateway = original_gateway


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
    assert len(orders_list.json()) >= 1
    assert any(o['order_number'] == order_number for o in orders_list.json())

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
