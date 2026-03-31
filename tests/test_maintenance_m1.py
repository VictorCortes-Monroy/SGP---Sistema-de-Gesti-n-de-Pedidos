import pytest
from httpx import AsyncClient
from tests.conftest import auth_header

@pytest.mark.asyncio
async def test_create_equipment(client: AsyncClient, seed_data) -> None:
    admin = seed_data["users"]["admin"]
    company = seed_data["company"]
    headers = auth_header(admin.id)
    
    data = {
        "code": "EQ-001",
        "name": "Excavator 1",
        "equipment_type": "EXCAVATOR",
        "company_id": str(company.id),
        "current_horometer": 100,
        "maintenance_interval_hours": 250
    }
    r = await client.post("/api/v1/maintenance/equipment/", headers=headers, json=data)
    assert r.status_code == 201
    created = r.json()
    assert created["code"] == "EQ-001"
    assert created["next_maintenance_due"] == 350.0

@pytest.mark.asyncio
async def test_create_provider(client: AsyncClient, seed_data) -> None:
    admin = seed_data["users"]["admin"]
    headers = auth_header(admin.id)
    data = {
        "name": "Test Provider",
        "rut": "12345678-9",
        "contact_email": "test@example.com",
        "equipment_types": ["EXCAVATOR"]
    }
    r = await client.post("/api/v1/maintenance/providers/", headers=headers, json=data)
    assert r.status_code == 201
    created = r.json()
    assert created["rut"] == "12345678-9"
    assert "EXCAVATOR" in created["equipment_types"]

@pytest.mark.asyncio
async def test_create_and_submit_maint_request(client: AsyncClient, seed_data) -> None:
    admin = seed_data["users"]["admin"]
    company = seed_data["company"]
    headers = auth_header(admin.id)

    # 1. Create equipment
    eq_data = {
        "code": "EQ-002",
        "name": "Crane 1",
        "equipment_type": "CRANE",
        "company_id": str(company.id),
        "current_horometer": 0,
        "maintenance_interval_hours": 500
    }
    r_eq = await client.post("/api/v1/maintenance/equipment/", headers=headers, json=eq_data)
    assert r_eq.status_code == 201
    equipment_id = r_eq.json()["id"]

    # 2. Create SM
    sm_data = {
        "equipment_id": equipment_id,
        "maintenance_type": "PREVENTIVE",
        "description": "Regular check",
        "planned_date": "2026-03-10T10:00:00"
    }
    r_sm = await client.post("/api/v1/maintenance/requests/", headers=headers, json=sm_data)
    assert r_sm.status_code == 201
    sm = r_sm.json()
    assert sm["status"] == "DRAFT"
    assert sm["code"].startswith("SM-")
    sm_id = sm["id"]

    # 3. Submit SM
    r_sub = await client.post(f"/api/v1/maintenance/requests/{sm_id}/submit", headers=headers)
    assert r_sub.status_code == 200
    assert r_sub.json()["status"] == "PENDING_APPROVAL"

    # 4. Approve SM
    r_app = await client.post(f"/api/v1/maintenance/requests/{sm_id}/approve", headers=headers, json={"cost_center_id": None})
    assert r_app.status_code == 200
    assert r_app.json()["status"] == "QUOTED_PENDING"
