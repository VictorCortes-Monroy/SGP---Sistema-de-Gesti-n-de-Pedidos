import pytest
from tests.conftest import auth_header

API = "/api/v1"


def _request_payload(cost_center_id: str) -> dict:
    return {
        "title": "Export Test Request",
        "description": "For testing export",
        "cost_center_id": cost_center_id,
        "items": [
            {"description": "Item A", "sku": "SKU-1", "quantity": 2, "unit_price": 100}
        ],
    }


class TestExport:
    async def test_export_excel(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        # Create a request so there's data to export
        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )

        resp = await client.get(
            f"{API}/requests/export?format=excel",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        assert "spreadsheetml" in resp.headers["content-type"]
        assert len(resp.content) > 0

    async def test_export_pdf(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )

        resp = await client.get(
            f"{API}/requests/export?format=pdf",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        assert "pdf" in resp.headers["content-type"]
        assert len(resp.content) > 0

    async def test_export_empty(self, client, seed_data):
        """Export with no data should still return a valid file."""
        user = seed_data["users"]["requester"]
        resp = await client.get(
            f"{API}/requests/export?format=excel",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        assert len(resp.content) > 0
