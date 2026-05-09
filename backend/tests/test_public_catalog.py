import pytest


async def login_admin(client):
    response = await client.post('/api/v1/auth/login', json={'email': 'admin@test.local', 'password': 'Admin1234!'})
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


async def create_product(
    client,
    headers,
    *,
    name: str,
    stock: int = 10,
    is_active: bool = True,
    is_available: bool = True,
    category_ids: list[int] | None = None,
    ingredients: list[dict[str, object]] | None = None,
):
    response = await client.post(
        '/api/v1/admin/products',
        json={
            'name': name,
            'description': f'{name} descripción',
            'price': '12.50',
            'stock_quantity': stock,
            'is_active': is_active,
            'is_available': is_available,
            'category_ids': category_ids or [],
            'ingredients': ingredients or [],
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


async def create_category(client, headers, *, name: str, is_active: bool = True):
    response = await client.post('/api/v1/admin/categories', json={'name': name, 'is_active': is_active}, headers=headers)
    assert response.status_code == 201
    return response.json()


async def create_ingredient(client, headers, *, name: str, is_active: bool = True):
    response = await client.post('/api/v1/admin/ingredients', json={'name': name, 'is_active': is_active}, headers=headers)
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_public_catalog_listing_uses_canonical_pagination(client):
    headers = await login_admin(client)
    await create_product(client, headers, name='Burger Classic', stock=5)

    response = await client.get('/api/v1/catalog/products?page=1&size=10')

    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {'items', 'total', 'page', 'size', 'pages'}
    assert payload['page'] == 1
    assert payload['size'] == 10
    assert payload['total'] >= 1
    assert payload['pages'] >= 1
    assert payload['items'][0]['name'] == 'Burger Classic'
    assert 'is_active' not in payload['items'][0]
    assert 'is_available' not in payload['items'][0]
    assert 'stock_quantity' not in payload['items'][0]


@pytest.mark.asyncio
async def test_public_catalog_hides_non_sellable_products_in_listing_and_detail(client):
    headers = await login_admin(client)
    sellable = await create_product(client, headers, name='Visible Product', stock=2, is_active=True, is_available=True)
    inactive = await create_product(client, headers, name='Inactive Product', stock=2, is_active=False, is_available=True)
    unavailable = await create_product(client, headers, name='Unavailable Product', stock=2, is_active=True, is_available=False)
    out_of_stock = await create_product(client, headers, name='Out Product', stock=0, is_active=True, is_available=True)
    soft_deleted = await create_product(client, headers, name='Deleted Product', stock=2, is_active=True, is_available=True)
    deleted_response = await client.delete(f"/api/v1/admin/products/{soft_deleted['id']}", headers=headers)
    assert deleted_response.status_code == 204

    listing = await client.get('/api/v1/catalog/products?page=1&size=20')
    assert listing.status_code == 200
    names = {item['name'] for item in listing.json()['items']}
    assert 'Visible Product' in names
    assert 'Inactive Product' not in names
    assert 'Unavailable Product' not in names
    assert 'Out Product' not in names
    assert 'Deleted Product' not in names

    visible_detail = await client.get(f"/api/v1/catalog/products/{sellable['slug']}")
    assert visible_detail.status_code == 200

    for product in [inactive, unavailable, out_of_stock, soft_deleted]:
        hidden_detail = await client.get(f"/api/v1/catalog/products/{product['id']}")
        assert hidden_detail.status_code == 404
        assert hidden_detail.json()['code'] == 'PRODUCT_NOT_FOUND'


@pytest.mark.asyncio
async def test_public_catalog_filters_by_search_and_category(client):
    headers = await login_admin(client)
    category = await create_category(client, headers, name='Combos')
    inactive_category = await create_category(client, headers, name='Ocultos')
    category_id = category['id']
    inactive_category_id = inactive_category['id']

    await create_product(client, headers, name='Combo Burger', stock=10, category_ids=[category_id])
    await create_product(client, headers, name='Pizza Margarita', stock=8)
    await create_product(client, headers, name='Combo Hidden', stock=0)
    await create_product(client, headers, name='Hidden Category Product', stock=5, category_ids=[inactive_category_id])
    inactive_category_response = await client.patch(f'/api/v1/admin/categories/{inactive_category_id}', json={'is_active': False}, headers=headers)
    assert inactive_category_response.status_code == 200

    by_search = await client.get('/api/v1/catalog/products?page=1&size=20&search=burger')
    assert by_search.status_code == 200
    assert {item['name'] for item in by_search.json()['items']} == {'Combo Burger'}

    by_category = await client.get(f'/api/v1/catalog/products?page=1&size=20&category_id={category_id}')
    assert by_category.status_code == 200
    assert {item['name'] for item in by_category.json()['items']} == {'Combo Burger'}

    by_inactive_category = await client.get(f'/api/v1/catalog/products?page=1&size=20&category_id={inactive_category_id}')
    assert by_inactive_category.status_code == 200
    assert by_inactive_category.json()['items'] == []
    assert by_inactive_category.json()['total'] == 0

    empty = await client.get('/api/v1/catalog/products?page=1&size=20&search=nonexistent-term')
    assert empty.status_code == 200
    assert empty.json()['items'] == []
    assert empty.json()['total'] == 0
    assert empty.json()['pages'] == 0


@pytest.mark.asyncio
async def test_public_catalog_detail_returns_public_fields_and_composition(client):
    headers = await login_admin(client)
    category = await create_category(client, headers, name='Platos')
    ingredient = await create_ingredient(client, headers, name='Queso')
    product = await create_product(
        client,
        headers,
        name='Mila Napolitana',
        stock=4,
        category_ids=[category['id']],
        ingredients=[{'ingredient_id': ingredient['id'], 'is_removable': True}],
    )

    response = await client.get(f"/api/v1/catalog/products/{product['slug']}")

    assert response.status_code == 200
    payload = response.json()
    assert payload['name'] == 'Mila Napolitana'
    assert payload['slug'] == 'mila-napolitana'
    assert payload['description'] == 'Mila Napolitana descripción'
    assert payload['price'] == '12.50'
    assert payload['categories'] == [{'id': category['id'], 'name': 'Platos', 'slug': 'platos'}]
    assert payload['ingredients'] == [{'ingredient_id': ingredient['id'], 'name': 'Queso', 'slug': 'queso', 'is_removable': True}]
    assert 'is_active' not in payload
    assert 'is_available' not in payload
    assert 'stock_quantity' not in payload
    assert 'created_at' not in payload
    assert 'updated_at' not in payload


@pytest.mark.asyncio
async def test_public_catalog_detail_not_found_uses_canonical_error_contract(client):
    missing = await client.get('/api/v1/catalog/products/999999')

    assert missing.status_code == 404
    payload = missing.json()
    assert payload['code'] == 'PRODUCT_NOT_FOUND'
    assert payload['title'] == 'Product Not Found'
    assert payload['status'] == 404
    assert payload['detail'] == 'The requested product does not exist.'
    assert payload['type'].endswith('/product-not-found')


@pytest.mark.asyncio
async def test_public_catalog_invalid_listing_params_use_canonical_validation_error(client):
    response = await client.get('/api/v1/catalog/products?page=0&size=101&category_id=0')

    assert response.status_code == 422
    payload = response.json()
    assert payload['code'] == 'VALIDATION_ERROR'
    assert payload['title'] == 'Validation Error'
    assert payload['status'] == 422
    assert payload['detail'] == 'The request contains invalid fields.'
    assert payload['type'].endswith('/validation-error')
    assert payload['instance'] == '/api/v1/catalog/products'
    assert 'timestamp' in payload
    assert {error['field'] for error in payload['errors']} == {'page', 'size', 'category_id'}
