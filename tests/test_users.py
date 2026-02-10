import pytest
from tests.conftest import auth_header

API = "/api/v1"


class TestUsersMe:
    async def test_get_me(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(f"{API}/users/me", headers=auth_header(user.id))
        assert resp.status_code == 200
        body = resp.json()
        assert body["email"] == "req@test.com"
        assert body["role_name"] == "Requester"

    async def test_update_me(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.put(
            f"{API}/users/me",
            headers=auth_header(user.id),
            json={"full_name": "Updated Name"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    async def test_update_me_cannot_change_role(self, client, seed_data):
        user = seed_data["users"]["requester"]
        admin_role = seed_data["roles"]["admin"]
        resp = await client.put(
            f"{API}/users/me",
            headers=auth_header(user.id),
            json={"role_id": str(admin_role.id)},
        )
        assert resp.status_code == 200
        # role_id should NOT have changed
        assert resp.json()["role_name"] == "Requester"


class TestUsersCRUD:
    async def test_list_users(self, client, seed_data):
        admin = seed_data["users"]["admin"]
        resp = await client.get(f"{API}/users/", headers=auth_header(admin.id))
        assert resp.status_code == 200
        assert len(resp.json()) == 4

    async def test_get_user_by_id(self, client, seed_data):
        admin = seed_data["users"]["admin"]
        tech = seed_data["users"]["tech"]
        resp = await client.get(
            f"{API}/users/{tech.id}", headers=auth_header(admin.id)
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "tech@test.com"

    async def test_create_user_as_admin(self, client, seed_data):
        admin = seed_data["users"]["admin"]
        resp = await client.post(
            f"{API}/users/",
            headers=auth_header(admin.id),
            json={
                "email": "newuser@test.com",
                "password": "newpass",
                "full_name": "New User",
                "role_id": str(seed_data["roles"]["requester"].id),
            },
        )
        assert resp.status_code == 201
        assert resp.json()["email"] == "newuser@test.com"

    async def test_create_duplicate_email(self, client, seed_data):
        admin = seed_data["users"]["admin"]
        resp = await client.post(
            f"{API}/users/",
            headers=auth_header(admin.id),
            json={
                "email": "req@test.com",
                "password": "pass",
                "full_name": "Dup",
                "role_id": str(seed_data["roles"]["requester"].id),
            },
        )
        assert resp.status_code == 400

    async def test_update_user_as_admin(self, client, seed_data):
        admin = seed_data["users"]["admin"]
        tech = seed_data["users"]["tech"]
        resp = await client.put(
            f"{API}/users/{tech.id}",
            headers=auth_header(admin.id),
            json={"full_name": "Jane Updated"},
        )
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Jane Updated"

    async def test_soft_delete_user(self, client, seed_data):
        admin = seed_data["users"]["admin"]
        fin = seed_data["users"]["financial"]
        # Delete
        resp = await client.delete(
            f"{API}/users/{fin.id}", headers=auth_header(admin.id)
        )
        assert resp.status_code == 204
        # Should not appear in list
        resp = await client.get(f"{API}/users/", headers=auth_header(admin.id))
        emails = [u["email"] for u in resp.json()]
        assert "fin@test.com" not in emails
