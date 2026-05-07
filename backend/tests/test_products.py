import pytest


async def login_admin(client):
    response = await client.post('/api/v1/auth/login', json={'email': 'admin@test.local', 'password': 'Admin1234!'})
    return {'Authorization': f"Bearer {response.json()['access_token']}"}


@pytest.mark.asyncio
async def test_product_crud_filters_and_semantics(client):
    headers = await login_admin(client)
    category = await client.post('/api/v1/admin/categories', json={'name': 'Bebidas'}, headers=headers)
    ingredient = await client.post('/api/v1/admin/ingredients', json={'name': 'Azúcar'}, headers=headers)

    create = await client.post('/api/v1/admin/products', json={
        'name': 'Coca Cola',
        'description': 'Lata 354ml',
        'price': '10.50',
        'stock_quantity': 12,
        'is_active': True,
        'is_available': True,
        'category_ids': [category.json()['id']],
        'ingredients': [{'ingredient_id': ingredient.json()['id'], 'is_removable': False}],
    }, headers=headers)
    assert create.status_code == 201
    product_id = create.json()['id']

    dup = await client.post('/api/v1/admin/products', json={'name': 'COCA COLA', 'price': '1.00', 'stock_quantity': 1}, headers=headers)
    assert dup.status_code == 409
    assert dup.json()['code'] == 'PRODUCT_DUPLICATE'

    invalid_price = await client.post('/api/v1/admin/products', json={'name': 'Fanta', 'price': '-1.00', 'stock_quantity': 1}, headers=headers)
    assert invalid_price.status_code in (400, 422)

    detail = await client.get(f'/api/v1/admin/products/{product_id}', headers=headers)
    assert detail.status_code == 200
    assert detail.json()['ingredients'][0]['is_removable'] is False

    patch_keep_assoc = await client.patch(f'/api/v1/admin/products/{product_id}', json={'description': 'Nueva'}, headers=headers)
    assert patch_keep_assoc.status_code == 200
    assert len(patch_keep_assoc.json()['categories']) == 1
    assert len(patch_keep_assoc.json()['ingredients']) == 1

    update_states = await client.patch(f'/api/v1/admin/products/{product_id}', json={'is_available': False, 'stock_quantity': 0}, headers=headers)
    assert update_states.status_code == 200
    assert update_states.json()['is_available'] is False
    assert update_states.json()['stock_quantity'] == 0

    by_category = await client.get(f"/api/v1/admin/products?page=1&size=20&category_id={category.json()['id']}", headers=headers)
    assert by_category.status_code == 200
    assert by_category.json()['total'] == 1

    by_availability = await client.get('/api/v1/admin/products?page=1&size=20&availability=false', headers=headers)
    assert by_availability.status_code == 200
    assert by_availability.json()['total'] == 1

    by_stock = await client.get('/api/v1/admin/products?page=1&size=20&stock_state=out_of_stock', headers=headers)
    assert by_stock.status_code == 200
    assert by_stock.json()['total'] == 1

    conflict_category_delete = await client.delete(f"/api/v1/admin/categories/{category.json()['id']}", headers=headers)
    assert conflict_category_delete.status_code == 409
    assert conflict_category_delete.json()['code'] == 'CATEGORY_HAS_PRODUCTS'

    conflict_ingredient_delete = await client.delete(f"/api/v1/admin/ingredients/{ingredient.json()['id']}", headers=headers)
    assert conflict_ingredient_delete.status_code == 409
    assert conflict_ingredient_delete.json()['code'] == 'INGREDIENT_HAS_PRODUCTS'

    soft_delete = await client.delete(f'/api/v1/admin/products/{product_id}', headers=headers)
    assert soft_delete.status_code == 204

    missing_detail = await client.get(f'/api/v1/admin/products/{product_id}', headers=headers)
    assert missing_detail.status_code == 404

    replacement = await client.post('/api/v1/admin/products', json={'name': 'Coca Cola', 'price': '11.00', 'stock_quantity': 1}, headers=headers)
    assert replacement.status_code == 201


@pytest.mark.asyncio
async def test_product_routes_require_admin(client):
    anon = await client.get('/api/v1/admin/products?page=1&size=10')
    assert anon.status_code == 401

    user = await client.post('/api/v1/auth/register', json={'first_name': 'No', 'last_name': 'Admin', 'email': 'product-user@test.local', 'password': 'StrongPass123!'})
    forbidden = await client.get('/api/v1/admin/products?page=1&size=10', headers={'Authorization': f"Bearer {user.json()['access_token']}"})
    assert forbidden.status_code == 403
