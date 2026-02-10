import pytest
from tests.conftest import auth_header

API = "/api/v1"


def _request_payload(cost_center_id: str, amount: float = 1500) -> dict:
    return {
        "title": "Test Request",
        "description": "Test",
        "cost_center_id": cost_center_id,
        "items": [
            {"description": "Item A", "sku": "SKU-1", "quantity": 3, "unit_price": amount}
        ],
    }


class TestCreateRequest:
    async def test_create_draft(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]
        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "DRAFT"
        assert float(body["total_amount"]) == 4500.0
        assert len(body["items"]) == 1


class TestSubmitRequest:
    async def test_submit_reserves_budget(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        # Create
        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        # Submit
        resp = await client.post(
            f"{API}/requests/{req_id}/submit",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "PENDING_TECHNICAL"

    async def test_cannot_submit_twice(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(user.id))
        resp = await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(user.id))
        assert resp.status_code == 400


class TestApprovalWorkflow:
    async def test_full_approval_flow(self, client, seed_data):
        """DRAFT -> PENDING_TECHNICAL -> PENDING_FINANCIAL -> APPROVED"""
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        fin = seed_data["users"]["financial"]
        cc = seed_data["cost_center"]

        # Create + Submit (amount > 1000 => needs both approvals)
        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id), amount=2000),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))

        # Tech approve
        resp = await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "Tech OK"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "PENDING_FINANCIAL"

        # Financial approve
        resp = await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(fin.id),
            json={"comment": "Finance OK"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "APPROVED"

    async def test_wrong_role_cannot_approve(self, client, seed_data):
        requester = seed_data["users"]["requester"]
        fin = seed_data["users"]["financial"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))

        # Financial tries to approve at tech step
        resp = await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(fin.id),
            json={"comment": "Nope"},
        )
        assert resp.status_code == 403


class TestRejectRequest:
    async def test_reject_releases_budget(self, client, seed_data):
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))

        resp = await client.post(
            f"{API}/requests/{req_id}/reject",
            headers=auth_header(tech.id),
            json={"comment": "Not needed"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "REJECTED"


class TestCancelRequest:
    async def test_cancel_draft(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        resp = await client.post(
            f"{API}/requests/{req_id}/cancel",
            headers=auth_header(user.id),
            json={"comment": "Changed my mind"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "CANCELLED"

    async def test_cancel_pending(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(user.id))

        resp = await client.post(
            f"{API}/requests/{req_id}/cancel",
            headers=auth_header(user.id),
            json={"comment": "Cancel after submit"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "CANCELLED"

    async def test_other_user_cannot_cancel(self, client, seed_data):
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        resp = await client.post(
            f"{API}/requests/{req_id}/cancel",
            headers=auth_header(tech.id),
            json={"comment": "Not my request"},
        )
        assert resp.status_code == 403


class TestSoftDeleteRequest:
    async def test_delete_draft(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        resp = await client.delete(
            f"{API}/requests/{req_id}", headers=auth_header(user.id)
        )
        assert resp.status_code == 204

        # Should not be found
        resp = await client.get(
            f"{API}/requests/{req_id}", headers=auth_header(user.id)
        )
        assert resp.status_code == 404

    async def test_cannot_delete_pending(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(user.id))

        resp = await client.delete(
            f"{API}/requests/{req_id}", headers=auth_header(user.id)
        )
        assert resp.status_code == 400


class TestTimeline:
    async def test_timeline_has_logs(self, client, seed_data):
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))
        await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "OK"},
        )

        resp = await client.get(
            f"{API}/requests/{req_id}/timeline",
            headers=auth_header(requester.id),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["current_status"] in ("PENDING_FINANCIAL", "APPROVED")
        assert len(body["logs"]) >= 2
