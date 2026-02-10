import asyncio
import sys
import logging
from sqlalchemy.ext.asyncio import AsyncSession

# Add project root to sys.path
import os
sys.path.append(os.getcwd())

from app.db.session import AsyncSessionLocal
from app.models.users import User, Role
from app.models.organization import Company, CostCenter
from app.models.budget import Budget
from app.models.workflow import ApprovalMatrix
from app.core import security

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def seed_data(db: AsyncSession):
    # 1. Create Roles
    role_admin = Role(name="Admin", description="System administrator")
    role_requester = Role(name="Requester", description="Orders items")
    role_tech_approver = Role(name="Technical Approver", description="Validates specs")
    role_fin_approver = Role(name="Financial Approver", description="Validates money")

    db.add_all([role_admin, role_requester, role_tech_approver, role_fin_approver])
    await db.commit()
    await db.refresh(role_admin)
    await db.refresh(role_requester)
    await db.refresh(role_tech_approver)
    await db.refresh(role_fin_approver)
    
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
    db.add_all([u_admin, u_req, u_tech, u_fin])
    
    # 5. Create Approval Matrix
    # Rule 1: All requests need Technical Approval
    rule1 = ApprovalMatrix(
        company_id=company.id,
        cost_center_id=cc.id,
        min_amount=0,
        max_amount=None,
        role_id=role_tech_approver.id,
        step_order=1
    )
    # Rule 2: Requests > 1000 need Financial Approval (Step 2)
    rule2 = ApprovalMatrix(
        company_id=company.id,
        cost_center_id=cc.id,
        min_amount=1000,
        max_amount=None,
        role_id=role_fin_approver.id,
        step_order=2
    )
    db.add_all([rule1, rule2])
    
    await db.commit()
    logger.info("Seeding Completed.")

async def main():
    async with AsyncSessionLocal() as session:
        await seed_data(session)

if __name__ == "__main__":
    asyncio.run(main())
