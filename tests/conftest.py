import pytest
import pytest_asyncio
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.db.base import Base
from app.main import app
from app.db.session import get_db
from app.core import security
from app.core.config import settings
from app.models.users import User, Role
from app.models.organization import Company, CostCenter
from app.models.budget import Budget
from app.models.workflow import ApprovalMatrix

# ---------------------------------------------------------------------------
# Create a dedicated test database (synchronous, runs once at import time)
# ---------------------------------------------------------------------------
TEST_DB_NAME = "sgp_db_test"


def _ensure_test_db():
    conn = psycopg2.connect(
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        host=settings.POSTGRES_SERVER,
        port=int(settings.POSTGRES_PORT),
        database="postgres",
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    cur.execute(f"DROP DATABASE IF EXISTS {TEST_DB_NAME}")
    cur.execute(f"CREATE DATABASE {TEST_DB_NAME}")
    cur.close()
    conn.close()


_ensure_test_db()

# ---------------------------------------------------------------------------
# Async engine pointing to the TEST database
# ---------------------------------------------------------------------------
_base = (
    f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
    f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}"
)
TEST_DB_URL = f"{_base}/{TEST_DB_NAME}"

engine_test = create_async_engine(TEST_DB_URL, echo=False)
TestSession = sessionmaker(engine_test, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    """Dispose stale connections, then drop+recreate tables for isolation."""
    # Dispose pool to avoid stale connections from previous test's event loop
    await engine_test.dispose()
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.execute(text("DROP TYPE IF EXISTS requeststatus CASCADE"))
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Clean up after test
    await engine_test.dispose()


async def _override_get_db():
    session = AsyncSession(engine_test, expire_on_commit=False)
    try:
        yield session
    finally:
        await session.close()


@pytest_asyncio.fixture
async def db():
    session = AsyncSession(engine_test, expire_on_commit=False)
    try:
        yield session
    finally:
        await session.close()


@pytest_asyncio.fixture
async def client():
    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_data(db: AsyncSession):
    """Seed roles, users, company, cost center, budget, approval matrix."""
    # Roles
    role_admin = Role(name="Admin", description="System administrator")
    role_req = Role(name="Requester", description="Orders items")
    role_tech = Role(name="Technical Approver", description="Validates specs")
    role_fin = Role(name="Financial Approver", description="Validates money")
    db.add_all([role_admin, role_req, role_tech, role_fin])
    await db.flush()

    # Company & Cost Center
    company = Company(name="TestCorp", tax_id="11.111.111-1")
    db.add(company)
    await db.flush()

    cc = CostCenter(name="Engineering", code="ENG-001", company_id=company.id)
    db.add(cc)
    await db.flush()

    # Budget
    budget = Budget(cost_center_id=cc.id, year=2024, total_amount=50000, reserved_amount=0, executed_amount=0)
    db.add(budget)

    # Users
    pwd_hash = security.get_password_hash("testpass")
    admin = User(email="admin@test.com", hashed_password=pwd_hash, full_name="Admin User", role_id=role_admin.id)
    requester = User(email="req@test.com", hashed_password=pwd_hash, full_name="Req User", role_id=role_req.id)
    tech = User(email="tech@test.com", hashed_password=pwd_hash, full_name="Tech User", role_id=role_tech.id)
    fin = User(email="fin@test.com", hashed_password=pwd_hash, full_name="Fin User", role_id=role_fin.id)
    db.add_all([admin, requester, tech, fin])
    await db.flush()

    # Approval Matrix
    rule1 = ApprovalMatrix(company_id=company.id, cost_center_id=cc.id, min_amount=0, max_amount=None, role_id=role_tech.id, step_order=1)
    rule2 = ApprovalMatrix(company_id=company.id, cost_center_id=cc.id, min_amount=1000, max_amount=None, role_id=role_fin.id, step_order=2)
    db.add_all([rule1, rule2])

    await db.commit()

    return {
        "roles": {"admin": role_admin, "requester": role_req, "tech": role_tech, "financial": role_fin},
        "users": {"admin": admin, "requester": requester, "tech": tech, "financial": fin},
        "company": company,
        "cost_center": cc,
        "budget": budget,
    }


def get_token(user_id) -> str:
    """Helper to generate a JWT for a test user."""
    return security.create_access_token(str(user_id))


def auth_header(user_id) -> dict:
    """Helper to build Authorization header."""
    return {"Authorization": f"Bearer {get_token(user_id)}"}
