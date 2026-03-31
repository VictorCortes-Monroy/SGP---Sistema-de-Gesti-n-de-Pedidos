import pytest
from httpx import AsyncClient
from uuid import uuid4
from tests.conftest import auth_header
from app.models.maintenance.request import MaintRequestStatus

@pytest.mark.asyncio
async def test_m2_gate_flow(client: AsyncClient, seed_data) -> None:
    admin = seed_data["users"]["admin"]
    company = seed_data["company"]
    headers = auth_header(admin.id)
    
    # 1. Create Provider
    provider_res = await client.post(
        "/api/v1/maintenance/providers/",
        json={
            "name": "Integration Test Provider",
            "rut": f"77{uuid4().hex[:6]}-K",
            "contact_email": "provider@test.com",
            "equipment_types": ["EXCAVATOR"]
        },
        headers=headers
    )
    assert provider_res.status_code == 201
    provider_id = provider_res.json()["id"]

    # 2. Create Equipment
    equip_res = await client.post(
        "/api/v1/maintenance/equipment/",
        json={
            "code": f"EQ-TEST-{uuid4().hex[:4]}",
            "name": "Test Equipment Gate",
            "equipment_type": "EXCAVATOR",
            "company_id": str(company.id),
            "current_horometer": 500,
            "maintenance_interval_hours": 250
        },
        headers=headers
    )
    assert equip_res.status_code == 201
    equipment_id = equip_res.json()["id"]
    
    # 3. Create SM
    sm_res = await client.post(
        "/api/v1/maintenance/requests/",
        json={
            "equipment_id": equipment_id,
            "maintenance_type": "PREVENTIVE",
            "description": "Integration Test Maintenance",
            "planned_date": "2026-04-01T10:00:00",
            "estimated_cost": 500000.0
        },
        headers=headers
    )
    assert sm_res.status_code == 201
    sm_id = sm_res.json()["id"]
    
    # 4. Submit SM
    sub_res = await client.post(f"/api/v1/maintenance/requests/{sm_id}/submit", headers=headers)
    assert sub_res.status_code == 200

    # 5. Approve SM with Cost Center (Dummy cost center id from seed data or random UUID)
    # The system will attempt to create an SGP PR if cost_center_id is provided
    # Actually, the user needs a CostCenter for SGP PR. Let's create one first using existing endpoints if needed, or just pass a UUID if foreign keys are not strictly enforced in tests.
    app_res = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/approve", 
        json={"cost_center_id": None}, # Setting None to bypass SGP PR FK constraints for now, we'll test the manual PO link
        headers=headers
    )
    assert app_res.status_code == 200
    assert app_res.json()["status"] == MaintRequestStatus.QUOTED_PENDING.value

    # 5b. Register quotation D2 (QUOTED_PENDING → AWAITING_PREREQUISITES)
    quot_res = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/register-quotation",
        json={"quotation_amount": 5000.0, "notes": "Proveedor cotizó el trabajo"},
        headers=headers
    )
    assert quot_res.status_code == 200
    assert quot_res.json()["status"] == MaintRequestStatus.AWAITING_PREREQUISITES.value

    # 6. Check Gate Status (should be false)
    gate_res = await client.get(f"/api/v1/maintenance/requests/{sm_id}/gate-status", headers=headers)
    assert gate_res.status_code == 200
    assert gate_res.json()["is_ready_for_execution"] is False

    # 7. Confirm Provider
    conf_res = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/confirm-provider",
        json={
            "provider_id": provider_id,
            "scheduled_start": "2026-04-02T08:00:00"
        },
        headers=headers
    )
    assert conf_res.status_code == 200
    
    # Check Gate again
    gate_res = await client.get(f"/api/v1/maintenance/requests/{sm_id}/gate-status", headers=headers)
    assert gate_res.json()["gate_conditions"]["provider_confirmed"] is True
    assert gate_res.json()["gate_conditions"]["transport_scheduled"] is False
    assert gate_res.json()["is_ready_for_execution"] is False

    # 8. Schedule Transport
    trans_res = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/schedule-transport",
        json={
            "scheduled_date": "2026-04-01T15:00:00",
            "notes": "Pick up at main site"
        },
        headers=headers
    )
    assert trans_res.status_code == 200
    
    # 9. Link Purchase Order (Simulating SGP generating the OC)
    link_res = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/link-purchase-order",
        json={
            "purchase_order_code": "OC-2026-0001"
        },
        headers=headers
    )
    assert link_res.status_code == 200
    
    # 10. Final Gate Check - Should have transitioned automatically!
    gate_res = await client.get(f"/api/v1/maintenance/requests/{sm_id}/gate-status", headers=headers)
    assert gate_res.json()["is_ready_for_execution"] is True
    assert gate_res.json()["status"] == MaintRequestStatus.READY_FOR_EXECUTION.value

