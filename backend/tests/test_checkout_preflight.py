from decimal import Decimal

import pytest

from app.core.database import get_session_factory
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


async def create_product(client, headers, *, name: str, stock: int = 10, is_active: bool = True, is_available: bool = True, price: str = '12.50'):
    response = await client.post(
        '/api/v1/admin/products',
        json={
            'name': name,
            'description': f'{name} descripción',
            'price': price,
            'stock_quantity': stock,
            'is_active': is_active,
            'is_available': is_available,
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
async def test_anonymous_preflight_returns_401(client):
    response = await client.post('/api/v1/checkout/preflight', json={'items': []})
    assert response.status_code == 401
    assert response.json()['code'] == 'AUTH_INVALID_TOKEN'


@pytest.mark.asyncio
async def test_preflight_returns_authoritative_summary_and_ignores_client_price(client):
    admin_headers = await login_admin(client)
    product = await create_product(client, admin_headers, name='Burger Prime', stock=10, price='20.00')

    customer = await register_user(client, email='checkout-valid@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    created_address = await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())
    assert created_address.status_code == 201

    response = await client.post(
        '/api/v1/checkout/preflight',
        headers=headers,
        json={
            'items': [
                {
                    'product_id': product['id'],
                    'quantity': 2,
                    'removed_ingredient_ids': [],
                    'unit_price': '0.01',
                    'user_id': 999,
                }
            ],
            'delivery_address_id': created_address.json()['id'],
            'user_id': 123,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload['subtotal'] == '40.00'
    assert payload['lines'][0]['unit_price'] == '20.00'
    assert payload['lines'][0]['line_total'] == '40.00'
    assert payload['delivery_address']['id'] == created_address.json()['id']


@pytest.mark.asyncio
async def test_preflight_rejects_empty_cart_and_invalid_quantity(client):
    customer = await register_user(client, email='checkout-empty@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

    empty_response = await client.post('/api/v1/checkout/preflight', headers=headers, json={'items': []})
    assert empty_response.status_code == 400
    assert empty_response.json()['code'] == 'CHECKOUT_EMPTY_CART'

    invalid_quantity = await client.post(
        '/api/v1/checkout/preflight',
        headers=headers,
        json={'items': [{'product_id': 1, 'quantity': 0, 'removed_ingredient_ids': []}]},
    )
    assert invalid_quantity.status_code == 422
    assert invalid_quantity.json()['code'] == 'CHECKOUT_INVALID_QUANTITY'


@pytest.mark.asyncio
async def test_preflight_rejects_non_sellable_and_insufficient_stock_products(client):
    admin_headers = await login_admin(client)
    inactive = await create_product(client, admin_headers, name='Inactive Product', is_active=False)
    unavailable = await create_product(client, admin_headers, name='Unavailable Product', is_available=False)
    out_stock = await create_product(client, admin_headers, name='Out Product', stock=0)
    low_stock = await create_product(client, admin_headers, name='Low Stock', stock=1)

    customer = await register_user(client, email='checkout-stock@example.com')
    headers = {'Authorization': f"Bearer {customer.json()['access_token']}"}
    await client.post('/api/v1/customer/addresses', headers=headers, json=address_payload())

    for product_id in [inactive['id'], unavailable['id'], 999999]:
        response = await client.post(
            '/api/v1/checkout/preflight',
            headers=headers,
            json={'items': [{'product_id': product_id, 'quantity': 1, 'removed_ingredient_ids': []}]},
        )
        assert response.status_code == 404
        assert response.json()['code'] == 'CHECKOUT_PRODUCT_INVALID'

    out_of_stock = await client.post(
        '/api/v1/checkout/preflight',
        headers=headers,
        json={'items': [{'product_id': out_stock['id'], 'quantity': 1, 'removed_ingredient_ids': []}]},
    )
    assert out_of_stock.status_code == 409
    assert out_of_stock.json()['code'] == 'CHECKOUT_INSUFFICIENT_STOCK'

    insufficient = await client.post(
        '/api/v1/checkout/preflight',
        headers=headers,
        json={'items': [{'product_id': low_stock['id'], 'quantity': 3, 'removed_ingredient_ids': []}]},
    )
    assert insufficient.status_code == 409
    assert insufficient.json()['code'] == 'CHECKOUT_INSUFFICIENT_STOCK'


@pytest.mark.asyncio
async def test_preflight_rejects_invalid_customization_and_address_rules_and_is_stateless(client):
    admin_headers = await login_admin(client)
    ingredient = await client.post('/api/v1/admin/ingredients', json={'name': 'Queso', 'is_active': True}, headers=admin_headers)
    assert ingredient.status_code == 201
    other_ingredient = await client.post('/api/v1/admin/ingredients', json={'name': 'Cebolla', 'is_active': True}, headers=admin_headers)
    assert other_ingredient.status_code == 201
    product_response = await client.post(
        '/api/v1/admin/products',
        json={
            'name': 'Pizza',
            'description': 'pizza',
            'price': '15.00',
            'stock_quantity': 5,
            'is_active': True,
            'is_available': True,
            'category_ids': [],
            'ingredients': [
                {'ingredient_id': ingredient.json()['id'], 'is_removable': False},
            ],
        },
        headers=admin_headers,
    )
    assert product_response.status_code == 201
    product = product_response.json()

    owner = await register_user(client, email='checkout-owner@example.com')
    owner_headers = {'Authorization': f"Bearer {owner.json()['access_token']}"}
    owner_address = await client.post('/api/v1/customer/addresses', headers=owner_headers, json=address_payload())
    assert owner_address.status_code == 201

    other = await register_user(client, email='checkout-other@example.com')
    other_headers = {'Authorization': f"Bearer {other.json()['access_token']}"}
    other_address = await client.post('/api/v1/customer/addresses', headers=other_headers, json=address_payload(street_number='999'))
    assert other_address.status_code == 201

    customization_fail = await client.post(
        '/api/v1/checkout/preflight',
        headers=owner_headers,
        json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': [ingredient.json()['id']]}]},
    )
    assert customization_fail.status_code == 400
    assert customization_fail.json()['code'] == 'CHECKOUT_INVALID_CUSTOMIZATION'

    foreign_ingredient_fail = await client.post(
        '/api/v1/checkout/preflight',
        headers=owner_headers,
        json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': [other_ingredient.json()['id']]}]},
    )
    assert foreign_ingredient_fail.status_code == 400
    assert foreign_ingredient_fail.json()['code'] == 'CHECKOUT_INVALID_CUSTOMIZATION'

    missing_default_owner = await register_user(client, email='checkout-no-default@example.com')
    missing_default_headers = {'Authorization': f"Bearer {missing_default_owner.json()['access_token']}"}
    no_default = await client.post(
        '/api/v1/checkout/preflight',
        headers=missing_default_headers,
        json={'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}]},
    )
    assert no_default.status_code == 400
    assert no_default.json()['code'] == 'CHECKOUT_DELIVERY_ADDRESS_REQUIRED'

    foreign_address = await client.post(
        '/api/v1/checkout/preflight',
        headers=owner_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': other_address.json()['id'],
        },
    )
    assert foreign_address.status_code == 404
    assert foreign_address.json()['code'] == 'CHECKOUT_DELIVERY_ADDRESS_NOT_FOUND'

    async with get_session_factory()() as session:
        stored_product = await session.get(Product, product['id'])
        before_stock = stored_product.stock_quantity

    success = await client.post(
        '/api/v1/checkout/preflight',
        headers=owner_headers,
        json={
            'items': [{'product_id': product['id'], 'quantity': 1, 'removed_ingredient_ids': []}],
            'delivery_address_id': owner_address.json()['id'],
        },
    )
    assert success.status_code == 200

    async with get_session_factory()() as session:
        stored_product = await session.get(Product, product['id'])
        assert stored_product.stock_quantity == before_stock
        assert stored_product.price == Decimal('15.00')
