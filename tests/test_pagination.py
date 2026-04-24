import pytest
from tests.conftest import auth_header

API = "/api/v1"


class TestPagination:
    async def test_requests_pagination_structure(self, client, seed_data):
        """Paginated response should have items, total, skip, limit."""
        user = seed_data["users"]["requester"]
        resp = await client.get(
            f"{API}/requests/", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert "total" in body
        assert "skip" in body
        assert "limit" in body
        assert isinstance(body["items"], list)
        assert isinstance(body["total"], int)

    async def test_users_pagination_structure(self, client, seed_data):
        admin = seed_data["users"]["admin"]
        resp = await client.get(f"{API}/users/", headers=auth_header(admin.id))
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert body["total"] == 4
        assert len(body["items"]) == 4

    async def test_pagination_skip_limit(self, client, seed_data):
        """Custom skip/limit should return correct subset."""
        admin = seed_data["users"]["admin"]
        # Get first 2 users
        resp = await client.get(
            f"{API}/users/?skip=0&limit=2", headers=auth_header(admin.id)
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["items"]) == 2
        assert body["total"] == 4
        assert body["skip"] == 0
        assert body["limit"] == 2

        # Get next 2
        resp = await client.get(
            f"{API}/users/?skip=2&limit=2", headers=auth_header(admin.id)
        )
        body = resp.json()
        assert len(body["items"]) == 2
        assert body["skip"] == 2

    async def test_budgets_pagination_structure(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(f"{API}/budgets/", headers=auth_header(user.id))
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert body["total"] == 1

    async def test_companies_pagination_structure(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(
            f"{API}/organizations/companies", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert body["total"] == 1

    async def test_approval_matrix_pagination_structure(self, client, seed_data):
        user = seed_data["users"]["admin"]
        resp = await client.get(
            f"{API}/approval-matrix/", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "items" in body
        assert body["total"] == 1
