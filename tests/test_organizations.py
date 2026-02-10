import pytest
from tests.conftest import auth_header

API = "/api/v1"


class TestCompanies:
    async def test_list_companies(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(
            f"{API}/organizations/companies", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_create_company(self, client, seed_data):
        user = seed_data["users"]["admin"]
        resp = await client.post(
            f"{API}/organizations/companies",
            headers=auth_header(user.id),
            json={"name": "NewCo", "tax_id": "22.222.222-2"},
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "NewCo"

    async def test_get_company_detail(self, client, seed_data):
        user = seed_data["users"]["requester"]
        company = seed_data["company"]
        resp = await client.get(
            f"{API}/organizations/companies/{company.id}",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["name"] == "TestCorp"
        assert len(body["cost_centers"]) == 1

    async def test_update_company(self, client, seed_data):
        user = seed_data["users"]["admin"]
        company = seed_data["company"]
        resp = await client.put(
            f"{API}/organizations/companies/{company.id}",
            headers=auth_header(user.id),
            json={"name": "RenamedCorp"},
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "RenamedCorp"

    async def test_duplicate_company(self, client, seed_data):
        user = seed_data["users"]["admin"]
        resp = await client.post(
            f"{API}/organizations/companies",
            headers=auth_header(user.id),
            json={"name": "TestCorp", "tax_id": "33.333.333-3"},
        )
        assert resp.status_code == 400


class TestCostCenters:
    async def test_list_cost_centers(self, client, seed_data):
        user = seed_data["users"]["requester"]
        resp = await client.get(
            f"{API}/organizations/cost-centers", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    async def test_create_cost_center(self, client, seed_data):
        user = seed_data["users"]["admin"]
        company = seed_data["company"]
        resp = await client.post(
            f"{API}/organizations/cost-centers",
            headers=auth_header(user.id),
            json={"name": "Sales", "code": "SAL-001", "company_id": str(company.id)},
        )
        assert resp.status_code == 201
        assert resp.json()["code"] == "SAL-001"

    async def test_filter_by_company(self, client, seed_data):
        user = seed_data["users"]["requester"]
        company = seed_data["company"]
        resp = await client.get(
            f"{API}/organizations/cost-centers?company_id={company.id}",
            headers=auth_header(user.id),
        )
        assert resp.status_code == 200
        assert all(cc["company_id"] == str(company.id) for cc in resp.json())


class TestApprovalMatrix:
    async def test_list_rules(self, client, seed_data):
        user = seed_data["users"]["admin"]
        resp = await client.get(
            f"{API}/approval-matrix/", headers=auth_header(user.id)
        )
        assert resp.status_code == 200
        assert len(resp.json()) == 2

    async def test_create_rule(self, client, seed_data):
        user = seed_data["users"]["admin"]
        resp = await client.post(
            f"{API}/approval-matrix/",
            headers=auth_header(user.id),
            json={
                "min_amount": 10000,
                "role_id": str(seed_data["roles"]["admin"].id),
                "step_order": 3,
            },
        )
        assert resp.status_code == 201
        assert resp.json()["step_order"] == 3

    async def test_delete_rule(self, client, seed_data):
        user = seed_data["users"]["admin"]
        # Get rules
        resp = await client.get(
            f"{API}/approval-matrix/", headers=auth_header(user.id)
        )
        rule_id = resp.json()[0]["id"]

        resp = await client.delete(
            f"{API}/approval-matrix/{rule_id}", headers=auth_header(user.id)
        )
        assert resp.status_code == 204
