import uuid
import pytest
from tests.conftest import auth_header
from app.models.organization import CostCenter

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
        """DRAFT -> PENDING_TECHNICAL -> APPROVED (financial approval moved to PO)"""
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id), amount=2000),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))

        # Tech approve — final step on SP; financial approval lives on the Purchase Order
        resp = await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "Tech OK"},
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
        assert body["current_status"] == "APPROVED"
        assert len(body["logs"]) >= 2


class TestSubmitHappyPaths:
    async def test_submit_without_budget_succeeds(self, client, db, seed_data):
        """Submitting to a CC without a budget should proceed (budget is reference-only)."""
        user = seed_data["users"]["requester"]
        company = seed_data["company"]

        cc2 = CostCenter(name="NoBudget", code="NB-001", company_id=company.id)
        db.add(cc2)
        await db.commit()

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc2.id)),
        )
        req_id = resp.json()["id"]

        resp = await client.post(
            f"{API}/requests/{req_id}/submit", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "PENDING_TECHNICAL"

    async def test_submit_allows_overdraft(self, client, seed_data):
        """Submit is allowed even when the amount exceeds available budget."""
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id), amount=20000),  # 3 * 20000 = 60000 > 50000
        )
        req_id = resp.json()["id"]

        resp = await client.post(
            f"{API}/requests/{req_id}/submit", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "PENDING_TECHNICAL"

        # Budget is allowed to go negative — reserva procede aunque sobrepase
        budget_resp = await client.get(f"{API}/budgets/", headers=auth_header(user.id))
        items = budget_resp.json()["items"]
        assert any(float(b["available_amount"]) < 0 for b in items)

    async def test_other_user_cannot_submit(self, client, seed_data):
        """Only the requester can submit their own request."""
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
            f"{API}/requests/{req_id}/submit", headers=auth_header(tech.id)
        )
        assert resp.status_code == 403


class TestReceiveRequest:
    async def _create_approved_request(self, client, seed_data):
        """Helper: create a request and advance it to APPROVED."""
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        fin = seed_data["users"]["financial"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id), amount=2000),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))
        await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "OK"},
        )
        await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(fin.id),
            json={"comment": "OK"},
        )
        return req_id

    async def test_receive_partial(self, client, seed_data):
        req_id = await self._create_approved_request(client, seed_data)
        resp = await client.post(
            f"{API}/requests/{req_id}/receive",
            headers=auth_header(seed_data["users"]["requester"].id),
            json={"is_partial": True, "comment": "Partial delivery"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "RECEIVED_PARTIAL"

    async def test_receive_full_completes(self, client, seed_data):
        req_id = await self._create_approved_request(client, seed_data)
        resp = await client.post(
            f"{API}/requests/{req_id}/receive",
            headers=auth_header(seed_data["users"]["requester"].id),
            json={"is_partial": False, "comment": "All received"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "COMPLETED"

    async def test_receive_on_draft_fails(self, client, seed_data):
        user = seed_data["users"]["requester"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        resp = await client.post(
            f"{API}/requests/{req_id}/receive",
            headers=auth_header(user.id),
            json={"is_partial": False, "comment": "Nope"},
        )
        assert resp.status_code == 400


class TestApproveErrorPaths:
    async def test_approve_draft_request(self, client, seed_data):
        """Cannot approve a DRAFT request."""
        user = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(user.id),
            json=_request_payload(str(cc.id)),
        )
        req_id = resp.json()["id"]

        resp = await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "Try"},
        )
        assert resp.status_code == 400

    async def test_approve_already_approved(self, client, seed_data):
        """Cannot approve an already APPROVED request."""
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        fin = seed_data["users"]["financial"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json=_request_payload(str(cc.id), amount=2000),
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))
        await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "OK"},
        )
        await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(fin.id),
            json={"comment": "OK"},
        )

        # Try to approve again
        resp = await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "Again"},
        )
        assert resp.status_code == 400

    async def test_get_nonexistent_request(self, client, seed_data):
        user = seed_data["users"]["requester"]
        fake_id = str(uuid.uuid4())
        resp = await client.get(
            f"{API}/requests/{fake_id}", headers=auth_header(user.id)
        )
        assert resp.status_code == 404
