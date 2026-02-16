import pytest
from tests.conftest import auth_header

API = "/api/v1"


def _request_payload(cost_center_id: str, title: str = "Filter Test", amount: float = 1500) -> dict:
    return {
        "title": title,
        "description": f"Description for {title}",
        "cost_center_id": cost_center_id,
        "items": [
            {"description": "Item A", "sku": "SKU-1", "quantity": 1, "unit_price": amount}
        ],
    }


class TestFilterByStatus:
    async def test_filter_draft_only(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        # Create 2 requests, submit 1
        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Draft One"),
        )
        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="To Submit"),
        )
        req_id = resp.json()["id"]
        await client.post(
            f"{API}/requests/{req_id}/submit", headers=auth_header(user.id)
        )

        # Filter DRAFT only
        resp = await client.get(
            f"{API}/requests/?status=DRAFT", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(r["status"] == "DRAFT" for r in items)

    async def test_filter_invalid_status(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(
            f"{API}/requests/?status=INVALID", headers=auth_header(user.id)
        )
        assert resp.status_code == 400


class TestSearchRequests:
    async def test_search_by_title(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Laptop Purchase"),
        )
        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Office Supplies"),
        )

        resp = await client.get(
            f"{API}/requests/?search=Laptop", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert "Laptop" in items[0]["title"]

    async def test_search_case_insensitive(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="URGENT Purchase"),
        )

        resp = await client.get(
            f"{API}/requests/?search=urgent", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert len(resp.json()["items"]) == 1

    async def test_search_no_results(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(
            f"{API}/requests/?search=nonexistent_xyz", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert resp.json()["total"] == 0
        assert resp.json()["items"] == []


class TestFilterByAmount:
    async def test_filter_min_amount(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Small", amount=100),
        )
        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Big", amount=5000),
        )

        resp = await client.get(
            f"{API}/requests/?min_amount=1000", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(float(r["total_amount"]) >= 1000 for r in items)

    async def test_filter_max_amount(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Cheap", amount=50),
        )
        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Expensive", amount=10000),
        )

        resp = await client.get(
            f"{API}/requests/?max_amount=500", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert all(float(r["total_amount"]) <= 500 for r in items)


class TestCombinedFilters:
    async def test_status_and_search(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Laptop Draft"),
        )
        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), title="Laptop Submitted"),
        )
        req_id = resp.json()["id"]
        await client.post(
            f"{API}/requests/{req_id}/submit", headers=auth_header(user.id)
        )

        # Search "Laptop" + status DRAFT
        resp = await client.get(
            f"{API}/requests/?search=Laptop&status=DRAFT",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert len(items) == 1
        assert items[0]["title"] == "Laptop Draft"
