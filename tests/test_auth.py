import uuid
import pytest
from sqlalchemy import update
from tests.conftest import auth_header, get_token
from app.models.users import User

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

    async def test_login_inactive_user(self, client, db, seed_data):
        """Inactive user should get 400."""
        user = seed_data["users"]["requester"]
        await db.execute(update(User).where(User.id == user.id).values(is_active=False))
        await db.commit()

        resp = await client.post(
            f"{API}/login/access-token",
            data={"username": "req@test.com", "password": "testpass"},
        )
        assert resp.status_code == 400
        assert "Inactive" in resp.json()["detail"]

    async def test_deleted_user_cannot_access(self, client, db, seed_data):
        """Soft-deleted user's token should be rejected."""
        user = seed_data["users"]["requester"]
        token_before = get_token(user.id)

        await db.execute(update(User).where(User.id == user.id).values(is_deleted=True))
        await db.commit()

        resp = await client.get(
            f"{API}/users/me",
            headers={"Authorization": f"Bearer {token_before}"},
        )
        assert resp.status_code in (404, 403)

    async def test_token_with_nonexistent_user_id(self, client, seed_data):
        """Token referencing a non-existent UUID should fail."""
        fake_token = get_token(uuid.uuid4())
        resp = await client.get(
            f"{API}/users/me",
            headers={"Authorization": f"Bearer {fake_token}"},
        )
        assert resp.status_code in (404, 403)
