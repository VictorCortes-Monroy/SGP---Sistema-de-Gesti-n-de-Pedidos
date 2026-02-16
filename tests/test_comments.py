import uuid
import pytest
from tests.conftest import auth_header

API = "/api/v1"


def _request_payload(cost_center_id: str) -> dict:
    return {
        "title": "Comment Test Request",
        "description": "For testing comments",
        "cost_center_id": cost_center_id,
        "items": [
            {"description": "Item A", "sku": "SKU-1", "quantity": 1, "unit_price": 500}
        ],
    }


class TestComments:
    async def _create_request(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]
        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        return resp.json()["id"]

    async def test_create_comment(self, client, seed_data):
        req_id = await self._create_request(client, seed_data)
        user = seed_data["users"]["requester"]

        resp = await client.post(
            f"{API}/requests/{req_id}/comments",
            headers=auth_header(user.id),
            json={"text": "This is a comment"},
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["text"] == "This is a comment"
        assert body["user_name"] == "Req User"

    async def test_list_comments(self, client, seed_data):
        req_id = await self._create_request(client, seed_data)
        user = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]

        # Add two comments from different users
        await client.post(
            f"{API}/requests/{req_id}/comments",
            headers=auth_header(user.id),
            json={"text": "First comment"},
        )
        await client.post(
            f"{API}/requests/{req_id}/comments",
            headers=auth_header(tech.id),
            json={"text": "Second comment"},
        )

        resp = await client.get(
            f"{API}/requests/{req_id}/comments",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        comments = resp.json()
        assert len(comments) == 2
        assert comments[0]["text"] == "First comment"
        assert comments[1]["text"] == "Second comment"

    async def test_comment_on_nonexistent_request(self, client, seed_data):
        user = seed_data["users"]["requester"]
        fake_id = str(uuid.uuid4())
        resp = await client.post(
            f"{API}/requests/{fake_id}/comments",
            headers=auth_header(user.id),
            json={"text": "Ghost request"},
        )
        assert resp.status_code == 404

    async def test_list_comments_empty(self, client, seed_data):
        req_id = await self._create_request(client, seed_data)
        user = seed_data["users"]["requester"]

        resp = await client.get(
            f"{API}/requests/{req_id}/comments",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        assert resp.json() == []
