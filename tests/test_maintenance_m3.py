import pytest
from httpx import AsyncClient
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import status
from datetime import datetime, timedelta

from app.models.maintenance.request import MaintRequestStatus
from tests.conftest import auth_header

@pytest.fixture
def get_auth_headers(seed_data):
    def _get_headers(role_key: str):
        # We assume seed_data has our usual users. If not, map to admin just to bypass
        user = seed_data["users"].get("admin") # For simplicity use admin which has all perms
        return auth_header(user.id)
    return _get_headers

@pytest.fixture
async def setup_m2_maintenance_request(client, seed_data, get_auth_headers):
    # E2E Setup to get a request to READY_FOR_EXECUTION
    headers = get_auth_headers("admin")
    
    # 1. Create Provider
    provider_res = await client.post(
        "/api/v1/maintenance/providers/",
        json={
            "name": "Integration Test Provider M3",
            "rut": f"77{uuid4().hex[:6]}-M",
            "contact_email": "provider_m3@test.com",
            "equipment_types": ["EXCAVATOR"]
        },
        headers=headers
    )
    provider_id = provider_res.json()["id"]

    # 2. Create Equipment
    equip_res = await client.post(
        "/api/v1/maintenance/equipment/",
        json={
            "code": f"EQ-TEST-{uuid4().hex[:4]}",
            "name": "Test Equipment M3",
            "equipment_type": "EXCAVATOR",
            "company_id": str(seed_data["company"].id),
            "current_horometer": 500,
            "maintenance_interval_hours": 250
        },
        headers=headers
    )
    equipment_id = equip_res.json()["id"]
    
    # 3. Create SM
    sm_res = await client.post("/api/v1/maintenance/requests/", json={
        "equipment_id": equipment_id,
        "maintenance_type": "PREVENTIVE",
        "description": "M3 Setup",
        "planned_date": "2026-05-01T10:00:00",
        "estimated_cost": 1000
    }, headers=headers)
    sm_id = sm_res.json()["id"]
    
    # Submit & Approve
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/submit", headers=headers)
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/approve", json={"cost_center_id": None}, headers=headers)

    # Register quotation D2 (QUOTED_PENDING → AWAITING_PREREQUISITES)
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/register-quotation", json={"quotation_amount": 3000.0}, headers=headers)

    # Gates
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/confirm-provider", json={"provider_id": provider_id}, headers=headers)
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/schedule-transport", json={"scheduled_date": "2026-05-01T15:00:00"}, headers=headers)
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/link-purchase-order", json={"purchase_order_code": "OC-SETUP"}, headers=headers)
    
    return {"id": sm_id}

# Integration testing for the Phase M3 workflow endpoints
# DRAFT -> PENDING_APPROVAL -> APPROVED -> AWAITING_PREREQUISITES -> READY_FOR_EXECUTION
# -> IN_TRANSIT_TO_WORKSHOP -> IN_MAINTENANCE -> PENDING_RECEPTION -> PENDING_CERTIFICATE (or IN_MAINTENANCE)

@pytest.mark.asyncio
async def test_m3_execution_reception_flow(
    client: AsyncClient,
    get_auth_headers: callable,
    setup_m2_maintenance_request: dict  # Reusing M2 fixture which puts it in READY_FOR_EXECUTION
):
    """
    Test the full End-to-End M3 execution and reception flow.
    """
    chief_headers = get_auth_headers("maintenance_chief")
    sm_id = setup_m2_maintenance_request["id"]

    # 1. Start Execution
    response = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/start-execution",
        headers=chief_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == MaintRequestStatus.IN_TRANSIT_TO_WORKSHOP.value

    # 2. Confirm Workshop Arrival
    response = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/confirm-workshop-arrival",
        headers=chief_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == MaintRequestStatus.IN_MAINTENANCE.value

    # 3. Complete Execution
    # Planners or Chiefs can do this
    response = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/complete-execution",
        headers=chief_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == MaintRequestStatus.PENDING_RECEPTION.value

    # 4. Reception (REJECTED first to test remediation loop)
    reject_payload = {
        "status": "REJECTED",
        "checklist": {
            "scope_verification": {"all_work_completed": False},
            "equipment_condition": {"hydraulic_systems": False}
        },
        "notes": "Hydraulics still leaking",
        "rejection_details": "Fix hoses",
        "remediation_deadline": (datetime.utcnow() + timedelta(days=2)).isoformat()
    }
    
    response = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/reception",
        json=reject_payload,
        headers=chief_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == MaintRequestStatus.IN_MAINTENANCE.value
    assert response.json()["rejection_reason"] == "Fix hoses"

    # 5. Complete Execution again
    response = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/complete-execution",
        headers=chief_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == MaintRequestStatus.PENDING_RECEPTION.value

    # 6. Reception (APPROVED)
    approve_payload = {
        "status": "APPROVED",
        "checklist": {
            "scope_verification": {"all_work_completed": True},
            "equipment_condition": {"hydraulic_systems": True, "electrical_systems": True},
            "operational_tests": {"startup_shutdown": True},
            "provider_documentation": {"technical_report": True}
        },
        "notes": "All issues fixed"
    }
    
    response = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/reception",
        json=approve_payload,
        headers=chief_headers
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == MaintRequestStatus.PENDING_CERTIFICATE.value
