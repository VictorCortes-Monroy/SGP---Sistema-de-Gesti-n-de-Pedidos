import asyncio
import sys
import logging
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

# Add project root to sys.path
import os
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.models.users import User, Role
from app.models.organization import Company, CostCenter
from app.models.budget import Budget
from app.models.workflow import ApprovalMatrix
from app.models.maintenance.equipment import MaintEquipment, MaintHorometerLog
from app.core import security

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data(db: AsyncSession):
    # 1. Create Roles
    role_admin = Role(name="Admin", description="System administrator")
    role_requester = Role(name="Requester", description="Orders items")
    role_tech_approver = Role(name="Technical Approver", description="Validates specs")
    role_fin_approver = Role(name="Financial Approver", description="Finance 1 — Approves OC between 1M and 5M CLP")
    role_maint_planner = Role(name="maintenance_planner", description="Maintenance Planner")
    role_maint_chief = Role(name="maintenance_chief", description="Maintenance Chief")
    role_purchasing = Role(name="Purchasing", description="Abastecimiento - Genera OC y valida facturas")
    role_finance = Role(name="Finance", description="Finanzas - visibilidad financiera")
    role_finance2 = Role(name="Finance 2", description="Gerencia General — Aprueba OC mayor a 5 millones CLP")

    db.add_all([role_admin, role_requester, role_tech_approver, role_fin_approver,
                role_maint_planner, role_maint_chief, role_purchasing, role_finance, role_finance2])
    await db.commit()
    await db.refresh(role_admin)
    await db.refresh(role_requester)
    await db.refresh(role_tech_approver)
    await db.refresh(role_fin_approver)
    await db.refresh(role_purchasing)
    await db.refresh(role_finance)
    await db.refresh(role_finance2)
    
    # 2. Create Company & Cost Center
    company = Company(name="TechCorp", tax_id="99.999.999-K")
    db.add(company)
    await db.commit()
    await db.refresh(company)
    
    cc = CostCenter(name="IT Operations", code="IT-001", company_id=company.id)
    db.add(cc)
    await db.commit()
    await db.refresh(cc)
    
    # 3. Create Budget
    budget = Budget(cost_center_id=cc.id, year=2024, total_amount=10000.00, reserved_amount=0, executed_amount=0)
    db.add(budget)
    
    # 4. Create Users
    u_admin = User(
        email="admin@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_admin.id,
        full_name="System Admin"
    )
    u_req = User(
        email="requester@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_requester.id,
        full_name="John Requester"
    )
    u_tech = User(
        email="tech@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_tech_approver.id,
        full_name="Jane Tech"
    )
    u_fin = User(
        email="financial@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_fin_approver.id,
        full_name="Scrooge McDuck"
    )
    u_maint_planner = User(
        email="planner@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_maint_planner.id,
        full_name="Bob Planner"
    )
    u_maint_chief = User(
        email="chief@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_maint_chief.id,
        full_name="Alice Chief"
    )
    u_purchasing = User(
        email="purchasing@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_purchasing.id,
        full_name="Carlos Abastecimiento"
    )
    u_finance = User(
        email="finance@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_finance.id,
        full_name="Diana Finanzas"
    )
    u_gm = User(
        email="gm@example.com",
        hashed_password=security.get_password_hash("password"),
        role_id=role_finance2.id,
        full_name="Gerente General"
    )
    db.add_all([u_admin, u_req, u_tech, u_fin, u_maint_planner, u_maint_chief, u_purchasing, u_finance, u_gm])
    
    # 5. Create Approval Matrix — global rules (company_id=None, cost_center_id=None
    #    means "applies to all companies and cost centers")
    # Rule 1: All requests require Technical Approval (step 1).
    # Financial approval has moved to the Purchase Order workflow — no step 2 here.
    rule1 = ApprovalMatrix(
        company_id=None,
        cost_center_id=None,
        min_amount=0,
        max_amount=None,
        role_id=role_tech_approver.id,
        step_order=1
    )
    db.add_all([rule1])
    await db.commit()

    # 6. Seed Equipment Fleet
    await db.refresh(u_admin)

    fleet = [
        dict(code="EX-CAT-001", name="Excavadora CAT 336",       equipment_type="EXCAVATOR",  brand="Caterpillar", model="336",        model_year=2020, serial_number="CAT336-20001", current_horometer=4_250.0, maintenance_interval_hours=250, status="OPERATIVE",       last_maintenance_date=datetime(2026, 1, 15), notes="Motor reconstruido 2025"),
        dict(code="EX-VOL-002", name="Excavadora Volvo EC380",    equipment_type="EXCAVATOR",  brand="Volvo",       model="EC380",      model_year=2021, serial_number="VEC380-21002", current_horometer=2_870.0, maintenance_interval_hours=250, status="IN_MAINTENANCE",  last_maintenance_date=datetime(2025, 11, 10), notes=None),
        dict(code="CM-MBZ-001", name="Camión Mercedes Actros",    equipment_type="TRUCK",      brand="Mercedes-Benz", model="Actros 3348", model_year=2019, serial_number="MBZ-ACTROS-001", current_horometer=98_400.0, maintenance_interval_hours=500, status="OPERATIVE",  last_maintenance_date=datetime(2026, 2, 1),  notes="Revisión técnica 2026 al día"),
        dict(code="CM-VOL-002", name="Camión Volvo FMX 500",      equipment_type="TRUCK",      brand="Volvo",       model="FMX 500",    model_year=2022, serial_number="VFMX500-22001", current_horometer=41_200.0, maintenance_interval_hours=500, status="OPERATIVE",       last_maintenance_date=datetime(2026, 1, 28),  notes=None),
        dict(code="GR-LIE-001", name="Grúa Liebherr LTM 1090",   equipment_type="CRANE",      brand="Liebherr",    model="LTM 1090-4.2", model_year=2018, serial_number="LTM1090-18001", current_horometer=6_800.0, maintenance_interval_hours=500, status="OPERATIVE",    last_maintenance_date=datetime(2025, 12, 5),  notes="Certificado de carga vigente"),
        dict(code="GE-CAT-001", name="Generador Caterpillar C13", equipment_type="GENERATOR",  brand="Caterpillar", model="C13",        model_year=2020, serial_number="CATC13-20001",  current_horometer=3_100.0, maintenance_interval_hours=500, status="OPERATIVE",       last_maintenance_date=datetime(2026, 1, 5),   notes="Respaldo de faena norte"),
        dict(code="CP-ATC-001", name="Compresora Atlas Copco XAS375", equipment_type="COMPRESSOR", brand="Atlas Copco", model="XAS 375", model_year=2021, serial_number="ACXAS375-21001", current_horometer=1_560.0, maintenance_interval_hours=250, status="OPERATIVE",   last_maintenance_date=datetime(2026, 2, 10),  notes=None),
        dict(code="RE-JCB-001", name="Retroexcavadora JCB 3CX",   equipment_type="EXCAVATOR",  brand="JCB",         model="3CX",        model_year=2019, serial_number="JCB3CX-19001",  current_horometer=5_400.0, maintenance_interval_hours=250, status="OUT_OF_SERVICE",  last_maintenance_date=datetime(2025, 9, 20),  notes="Falla hidráulica — esperando repuesto"),
        dict(code="CF-KOM-001", name="Cargador Frontal Komatsu WA380", equipment_type="FORKLIFT", brand="Komatsu",  model="WA380-8",    model_year=2022, serial_number="KWA380-22001",  current_horometer=2_200.0, maintenance_interval_hours=500, status="OPERATIVE",       last_maintenance_date=datetime(2026, 2, 20),  notes=None),
        dict(code="MN-CAT-001", name="Motoniveladora CAT 14M",    equipment_type="OTHER",       brand="Caterpillar", model="14M",        model_year=2017, serial_number="CAT14M-17001",  current_horometer=12_300.0, maintenance_interval_hours=500, status="OPERATIVE",      last_maintenance_date=datetime(2025, 12, 15), notes="Hoja principal rectificada 2025"),
    ]

    for f in fleet:
        interval = f.pop("maintenance_interval_hours")
        hor = f.pop("current_horometer")
        last_maint = f.pop("last_maintenance_date")
        eq = MaintEquipment(
            **f,
            company_id=company.id,
            cost_center_id=cc.id,
            current_horometer=hor,
            maintenance_interval_hours=interval,
            last_maintenance_date=last_maint,
            next_maintenance_due=hor + interval,
        )
        db.add(eq)
        await db.flush()
        if hor > 0:
            db.add(MaintHorometerLog(
                equipment_id=eq.id,
                reading=hor,
                previous_reading=0.0,
                hours_delta=hor,
                recorded_by_id=u_admin.id,
                notes="Carga inicial — seed data",
            ))

    await db.commit()
    logger.info("Seeding Completed.")

async def main():
    async with AsyncSessionLocal() as session:
        await seed_data(session)

if __name__ == "__main__":
    asyncio.run(main())
