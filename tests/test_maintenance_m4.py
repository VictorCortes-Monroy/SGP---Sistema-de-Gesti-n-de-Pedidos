import pytest
from httpx import AsyncClient
from uuid import UUID, uuid4

from tests.conftest import auth_header

@pytest.fixture
def get_auth_headers(seed_data):
    def _get_headers(role_key: str):
        user = seed_data["users"].get("admin")
        return auth_header(user.id)
    return _get_headers

@pytest.fixture
async def setup_m4_maintenance_request(
    client: AsyncClient,
    seed_data,
    get_auth_headers
):
    admin_token_headers = get_auth_headers("admin")
    """Setup a Maintenance Request completely ready for Phase M4 (PENDING_CERTIFICATE)."""
    # 1. Create Provider
    provider_resp = await client.post(
        "/api/v1/maintenance/providers/",
        headers=admin_token_headers,
        json={
            "name": "M4 Automation Provider", 
            "rut": f"77{uuid4().hex[:6]}-M",
            "contact_email": "m4@example.com",
            "equipment_types": ["EXCAVATOR"]
        }
    )
    provider_id = provider_resp.json()["id"]

    # 2. Create Equipment
    equip_resp = await client.post(
        "/api/v1/maintenance/equipment/",
        headers=admin_token_headers,
        json={
            "code": f"M4-E2E-{uuid4().hex[:4]}",
            "name": "M4 Test Equipment",
            "equipment_type": "EXCAVATOR",
            "company_id": str(seed_data["company"].id),
            "current_horometer": 1000,
            "maintenance_interval_hours": 250
        }
    )
    equipment_id = equip_resp.json()["id"]

    # 3. Create SM & Submit & Approve & Confirm
    sm_resp = await client.post(
        "/api/v1/maintenance/requests/",
        headers=admin_token_headers,
        json={
            "equipment_id": equipment_id,
            "maintenance_type": "PREVENTIVE",
            "description": "M4 E2E Run",
            "planned_date": "2024-12-01T00:00:00"
        }
    )
    sm_id = sm_resp.json()["id"]

    await client.post(f"/api/v1/maintenance/requests/{sm_id}/submit", headers=admin_token_headers)
    
    # 4. Approve → QUOTED_PENDING, then register quotation D2 → AWAITING_PREREQUISITES
    await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/approve",
        headers=admin_token_headers,
        json={"cost_center_id": None}
    )
    await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/register-quotation",
        headers=admin_token_headers,
        json={"quotation_amount": 8000.0, "notes": "Cotización M4"}
    )

    # Provider & Transport
    await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/confirm-provider",
        headers=admin_token_headers,
        json={"provider_id": provider_id}
    )
    await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/schedule-transport",
        headers=admin_token_headers,
        json={"scheduled_date": "2024-12-05T00:00:00"}
    )

    # 5. Link PO to satisfy Gate
    await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/link-purchase-order",
        headers=admin_token_headers,
        json={"purchase_order_code": "OC-M4-TEST"}
    )

    # Execution 
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/start-execution", headers=admin_token_headers)
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/confirm-workshop-arrival", headers=admin_token_headers)
    await client.post(f"/api/v1/maintenance/requests/{sm_id}/complete-execution", headers=admin_token_headers)

    # Reception
    await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/reception",
        headers=admin_token_headers,
        json={
            "status": "APPROVED",
            "checklist": {
                "scope_verification": {"all_work_completed": True},
                "equipment_condition": {"hydraulic_systems": True, "electrical_systems": True},
                "operational_tests": {"startup_shutdown": True},
                "provider_documentation": {"technical_report": True}
            },
            "notes": "Everything ok"
        }
    )

    return sm_id, equipment_id

@pytest.mark.asyncio
async def test_m4_completion_workflow(
    client: AsyncClient,
    get_auth_headers,
    setup_m4_maintenance_request
):
    admin_token_headers = get_auth_headers("admin")
    sm_id, equipment_id = setup_m4_maintenance_request

    # 1. Verify we are in PENDING_CERTIFICATE
    resp = await client.get(f"/api/v1/maintenance/requests/{sm_id}", headers=admin_token_headers)
    assert resp.status_code == 200
    assert resp.json()["status"] == "PENDING_CERTIFICATE"

    # 2. Upload Certificate
    file_bytes = b"dummy certificate pdf content"
    files = {"file": ("test_cert.pdf", file_bytes, "application/pdf")}
    cert_resp = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/upload-certificate",
        headers=admin_token_headers,
        files=files
    )
    assert cert_resp.status_code == 200
    data = cert_resp.json()
    assert data["status"] == "IN_TRANSIT_TO_FIELD"
    assert data["certificate_uploaded"] is True

    # 3. Confirm Field Return → now transitions to PENDING_D5
    ret_resp = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/confirm-field-return",
        headers=admin_token_headers
    )
    assert ret_resp.status_code == 200
    data = ret_resp.json()
    assert data["status"] == "PENDING_D5"

    # Equipment still IN_TRANSIT or previous state (OPERATIVE deferred to confirm-payment)
    eq_resp = await client.get(f"/api/v1/maintenance/equipment/{equipment_id}", headers=admin_token_headers)
    assert eq_resp.status_code == 200

    # 4. Sign D5 → INVOICING_READY
    d5_resp = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/sign-d5",
        headers=admin_token_headers,
        json={"notes": "Cierre operativo conforme"}
    )
    assert d5_resp.status_code == 200
    assert d5_resp.json()["status"] == "INVOICING_READY"

    # 5. Register Invoice → PENDING_PAYMENT (RN8 validates D1+D2+D3+D4+D5)
    inv_resp = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/register-invoice",
        headers=admin_token_headers,
        json={"invoice_number": "FA-12345", "invoice_amount": 500000.0}
    )
    assert inv_resp.status_code == 200
    data = inv_resp.json()
    assert data["status"] == "PENDING_PAYMENT"
    assert data["invoice_number"] == "FA-12345"

    # 6. Confirm Payment → CLOSED + equipment OPERATIVE
    pay_resp = await client.post(
        f"/api/v1/maintenance/requests/{sm_id}/confirm-payment",
        headers=admin_token_headers,
        json={"notes": "Transferencia procesada"}
    )
    assert pay_resp.status_code == 200
    assert pay_resp.json()["status"] == "CLOSED"

    # Equipment should now be OPERATIVE
    eq_resp = await client.get(f"/api/v1/maintenance/equipment/{equipment_id}", headers=admin_token_headers)
    eq_data = eq_resp.json()
    assert eq_data["status"] == "OPERATIVE"
    assert eq_data["next_maintenance_due"] == 1250

    # 7. Timeline endpoint checkout
    timeline_resp = await client.get(
        f"/api/v1/maintenance/requests/{sm_id}/timeline",
        headers=admin_token_headers
    )
    assert timeline_resp.status_code == 200
    timeline = timeline_resp.json()
    assert len(timeline) > 5
    assert timeline[-1]["action"] == "PAYMENT_CONFIRMED"
    assert timeline[-2]["action"] == "INVOICE_REGISTERED"

@pytest.mark.asyncio
async def test_m4_analytics_and_export(
    client: AsyncClient,
    get_auth_headers
):
    admin_token_headers = get_auth_headers("admin")
    # Analytics summary
    resp = await client.get("/api/v1/maintenance/analytics/summary", headers=admin_token_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "total_preventive" in data
    assert "in_execution" in data
    assert "average_cycle_time_days" in data
    assert "upcoming_maintenance" in data

    # Export
    export_resp = await client.get("/api/v1/maintenance/requests/export?format=excel", headers=admin_token_headers)
    assert export_resp.status_code == 200
    assert export_resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
