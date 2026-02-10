import pytest
from tests.conftest import auth_header

API = "/api/v1"


class TestLogin:
    async def test_login_success(self, client, seed_data):
        resp = await client.post(
            f"{API}/login/access-token",
            data={"username": "req@test.com", "password": "testpass"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    async def test_login_wrong_password(self, client, seed_data):
        resp = await client.post(
            f"{API}/login/access-token",
            data={"username": "req@test.com", "password": "wrong"},
        )
        assert resp.status_code == 400

    async def test_login_nonexistent_user(self, client, seed_data):
        resp = await client.post(
            f"{API}/login/access-token",
            data={"username": "nobody@test.com", "password": "testpass"},
        )
        assert resp.status_code == 400

    async def test_protected_endpoint_no_token(self, client, seed_data):
        resp = await client.get(f"{API}/users/me")
        assert resp.status_code == 401

    async def test_protected_endpoint_invalid_token(self, client, seed_data):
        resp = await client.get(
            f"{API}/users/me",
            headers={"Authorization": "Bearer invalid.token.here"},
        )
        assert resp.status_code == 403

    async def test_admin_role_required(self, client, seed_data):
        """Requester cannot create users (needs Admin)."""
        requester = seed_data["users"]["requester"]
        resp = await client.post(
            f"{API}/users/",
            headers=auth_header(requester.id),
            json={
                "email": "new@test.com",
                "password": "pass",
                "full_name": "New",
                "role_id": str(seed_data["roles"]["requester"].id),
            },
        )
        assert resp.status_code == 403
