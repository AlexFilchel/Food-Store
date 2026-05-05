import pytest


@pytest.mark.asyncio
async def test_pagination_contract_uses_page_and_size(client):
    response = await client.get('/api/v1/contracts/pagination-example?page=2&size=2')

    assert response.status_code == 200
    payload = response.json()
    assert payload == {
        'items': [
            {'id': 3, 'code': 'PEDIDOS', 'label': 'Order Manager'},
            {'id': 4, 'code': 'CLIENT', 'label': 'Client'},
        ],
        'total': 4,
        'page': 2,
        'size': 2,
        'pages': 2,
    }
