"""
Seed de flota de equipos de prueba.
Idempotente: inserta solo los equipos que no existan por código.
Uso: docker-compose exec app python scripts/seed_equipment.py
"""
import asyncio
import sys
import logging
from datetime import datetime

import os
sys.path.append(os.getcwd())

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import AsyncSessionLocal
from app.models.organization import Company
from app.models.users import User
from app.models.maintenance.equipment import MaintEquipment, MaintHorometerLog

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FLEET = [
    dict(code="EX-CAT-001", name="Excavadora CAT 336",           equipment_type="EXCAVATOR",   brand="Caterpillar",  model="336",          model_year=2020, serial_number="CAT336-20001",    current_horometer=4_250.0, maintenance_interval_hours=250, status="OPERATIVE",      last_maintenance_date=datetime(2026, 1, 15),  notes="Motor reconstruido 2025"),
    dict(code="EX-VOL-002", name="Excavadora Volvo EC380",        equipment_type="EXCAVATOR",   brand="Volvo",        model="EC380",         model_year=2021, serial_number="VEC380-21002",    current_horometer=2_870.0, maintenance_interval_hours=250, status="IN_MAINTENANCE", last_maintenance_date=datetime(2025, 11, 10), notes=None),
    dict(code="CM-MBZ-001", name="Camión Mercedes-Benz Actros",   equipment_type="TRUCK",       brand="Mercedes-Benz",model="Actros 3348",   model_year=2019, serial_number="MBZ-ACTROS-001",  current_horometer=98_400.0,maintenance_interval_hours=500, status="OPERATIVE",      last_maintenance_date=datetime(2026, 2, 1),   notes="Revisión técnica 2026 al día"),
    dict(code="CM-VOL-002", name="Camión Volvo FMX 500",          equipment_type="TRUCK",       brand="Volvo",        model="FMX 500",       model_year=2022, serial_number="VFMX500-22001",   current_horometer=41_200.0,maintenance_interval_hours=500, status="OPERATIVE",      last_maintenance_date=datetime(2026, 1, 28),  notes=None),
    dict(code="GR-LIE-001", name="Grúa Liebherr LTM 1090",       equipment_type="CRANE",       brand="Liebherr",     model="LTM 1090-4.2",  model_year=2018, serial_number="LTM1090-18001",   current_horometer=6_800.0, maintenance_interval_hours=500, status="OPERATIVE",      last_maintenance_date=datetime(2025, 12, 5),  notes="Certificado de carga vigente"),
    dict(code="GE-CAT-001", name="Generador Caterpillar C13",     equipment_type="GENERATOR",   brand="Caterpillar",  model="C13",           model_year=2020, serial_number="CATC13-20001",    current_horometer=3_100.0, maintenance_interval_hours=500, status="OPERATIVE",      last_maintenance_date=datetime(2026, 1, 5),   notes="Respaldo de faena norte"),
    dict(code="CP-ATC-001", name="Compresora Atlas Copco XAS375", equipment_type="COMPRESSOR",  brand="Atlas Copco",  model="XAS 375",       model_year=2021, serial_number="ACXAS375-21001",  current_horometer=1_560.0, maintenance_interval_hours=250, status="OPERATIVE",      last_maintenance_date=datetime(2026, 2, 10),  notes=None),
    dict(code="RE-JCB-001", name="Retroexcavadora JCB 3CX",       equipment_type="EXCAVATOR",   brand="JCB",          model="3CX",           model_year=2019, serial_number="JCB3CX-19001",    current_horometer=5_400.0, maintenance_interval_hours=250, status="OUT_OF_SERVICE", last_maintenance_date=datetime(2025, 9, 20),  notes="Falla hidráulica — esperando repuesto"),
    dict(code="CF-KOM-001", name="Cargador Frontal Komatsu WA380",equipment_type="FORKLIFT",    brand="Komatsu",      model="WA380-8",       model_year=2022, serial_number="KWA380-22001",    current_horometer=2_200.0, maintenance_interval_hours=500, status="OPERATIVE",      last_maintenance_date=datetime(2026, 2, 20),  notes=None),
    dict(code="MN-CAT-001", name="Motoniveladora CAT 14M",         equipment_type="OTHER",       brand="Caterpillar",  model="14M",           model_year=2017, serial_number="CAT14M-17001",    current_horometer=12_300.0,maintenance_interval_hours=500, status="OPERATIVE",      last_maintenance_date=datetime(2025, 12, 15), notes="Hoja principal rectificada 2025"),
]


async def run(db: AsyncSession):
    # Get first company
    company_res = await db.execute(select(Company).limit(1))
    company = company_res.scalars().first()
    if not company:
        logger.error("No company found. Run initial_data.py first.")
        return

    # Get admin user
    admin_res = await db.execute(select(User).join(User.role).where(User.email == "admin@example.com"))
    admin = admin_res.scalars().first()
    if not admin:
        logger.error("Admin user not found.")
        return

    inserted = 0
    skipped = 0

    for f in FLEET:
        code = f["code"]
        existing = await db.execute(select(MaintEquipment).where(MaintEquipment.code == code))
        if existing.scalars().first():
            logger.info(f"  SKIP  {code} (ya existe)")
            skipped += 1
            continue

        interval   = f["maintenance_interval_hours"]
        hor        = f["current_horometer"]
        last_maint = f["last_maintenance_date"]

        eq = MaintEquipment(
            code=code,
            name=f["name"],
            equipment_type=f["equipment_type"],
            brand=f.get("brand"),
            model=f.get("model"),
            model_year=f.get("model_year"),
            serial_number=f.get("serial_number"),
            status=f.get("status", "OPERATIVE"),
            notes=f.get("notes"),
            company_id=company.id,
            current_horometer=hor,
            maintenance_interval_hours=interval,
            last_maintenance_date=last_maint,
            next_maintenance_due=hor + interval,
        )
        db.add(eq)
        await db.flush()

        db.add(MaintHorometerLog(
            equipment_id=eq.id,
            reading=hor,
            previous_reading=0.0,
            hours_delta=hor,
            recorded_by_id=admin.id,
            notes="Carga inicial — seed data",
        ))
        logger.info(f"  INSERT {code} — {f['name']}")
        inserted += 1

    await db.commit()
    logger.info(f"\nDone. {inserted} insertados, {skipped} omitidos.")


async def main():
    async with AsyncSessionLocal() as session:
        await run(session)


if __name__ == "__main__":
    asyncio.run(main())
