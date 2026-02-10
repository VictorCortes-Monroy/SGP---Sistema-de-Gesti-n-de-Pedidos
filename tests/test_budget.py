import pytest
from tests.conftest import auth_header

API = "/api/v1"


class TestBudget:
    async def test_list_budgets(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(f"{API}/budgets/", headers=auth_header(user.id))
        assert resp.status_code == 200
        budgets = resp.json()
        assert len(budgets) == 1
        assert float(budgets[0]["total_amount"]) == 50000.0
        assert float(budgets[0]["available_amount"]) == 50000.0

    async def test_budget_after_submit_and_complete(self, client, seed_data):
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        fin = seed_data["users"]["financial"]
        cc = seed_data["cost_center"]

        # Create + Submit ($6000 total)
        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json={
                "title": "Budget test",
                "cost_center_id": str(cc.id),
                "items": [{"description": "Big item", "quantity": 3, "unit_price": 2000}],
            },
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))

        # Check reserved
        resp = await client.get(f"{API}/budgets/", headers=auth_header(requester.id))
        budget = resp.json()[0]
        assert float(budget["reserved_amount"]) == 6000.0
        assert float(budget["available_amount"]) == 44000.0

        # Approve tech + fin
        await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(tech.id),
            json={"comment": "ok"},
        )
        await client.post(
            f"{API}/requests/{req_id}/approve",
            headers=auth_header(fin.id),
            json={"comment": "ok"},
        )

        # Receive full
        await client.post(
            f"{API}/requests/{req_id}/receive",
            headers=auth_header(requester.id),
            json={"is_partial": False, "comment": "received"},
        )

        # Check committed
        resp = await client.get(f"{API}/budgets/", headers=auth_header(requester.id))
        budget = resp.json()[0]
        assert float(budget["reserved_amount"]) == 0.0
        assert float(budget["executed_amount"]) == 6000.0
        assert float(budget["available_amount"]) == 44000.0

    async def test_budget_release_on_reject(self, client, seed_data):
        requester = seed_data["users"]["requester"]
        tech = seed_data["users"]["tech"]
        cc = seed_data["cost_center"]

        resp = await client.post(
            f"{API}/requests/",
            headers=auth_header(requester.id),
            json={
                "title": "Reject test",
                "cost_center_id": str(cc.id),
                "items": [{"description": "Item", "quantity": 1, "unit_price": 5000}],
            },
        )
        req_id = resp.json()["id"]
        await client.post(f"{API}/requests/{req_id}/submit", headers=auth_header(requester.id))

        # Reject
        await client.post(
            f"{API}/requests/{req_id}/reject",
            headers=auth_header(tech.id),
            json={"comment": "rejected"},
        )

        # Budget should be fully released
        resp = await client.get(f"{API}/budgets/", headers=auth_header(requester.id))
        budget = resp.json()[0]
        assert float(budget["reserved_amount"]) == 0.0
