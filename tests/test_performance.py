from tests.conftest import auth_header

API = "/api/v1"


def _request_payload(cost_center_id: str) -> dict:
    return {
        "title": "Perf Test",
        "description": "Performance test request",
        "cost_center_id": cost_center_id,
        "items": [
            {"description": "Item", "sku": "SKU-1", "quantity": 1, "unit_price": 100}
        ],
    }


class TestN1Queries:
    async def test_list_requests_bounded(self, client, seed_data, query_counter):
        """Listing requests should not issue N+1 queries."""
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        # Create 5 requests
        for _ in range(5):
            await client.post(
                f"{API}/requests/",
                headers=auth_header(user.id),
                json=_request_payload(str(cc.id)),
            )

        query_counter.reset()
        resp = await client.get(f"{API}/requests/", headers=auth_header(user.id))
        assert resp.status_code == 200

        # Should be bounded: auth query (user + role selectinload) + count + list + selectinloads
        # Not 1 + N (one per request)
        assert query_counter.count <= 7, f"Too many queries: {query_counter.count}"

    async def test_list_users_bounded(self, client, seed_data, query_counter):
        """Listing users should not issue N+1 queries."""
        admin = seed_data["users"]["admin"]

        query_counter.reset()
        resp = await client.get(f"{API}/users/", headers=auth_header(admin.id))
        assert resp.status_code == 200

        assert query_counter.count <= 5, f"Too many queries: {query_counter.count}"

    async def test_request_detail_bounded(self, client, seed_data, query_counter):
        """Request detail should use bounded queries."""
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        query_counter.reset()
        resp = await client.get(
            f"{API}/requests/{req_id}", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert query_counter.count <= 8, f"Too many queries: {query_counter.count}"
