import pytest
from decimal import Decimal
from sqlalchemy.orm import selectinload
from sqlalchemy import select

from app.services.workflow import WorkflowEngine
from app.models.request import Request, RequestItem, RequestStatus
from app.models.users import User


def _make_request(seed_data, amount=5000):
    """Helper to build a Request object with required relationships."""
    return Request(
        title="WF Test",
        description="Workflow test",
        requester_id=seed_data["users"]["requester"].id,
        cost_center_id=seed_data["cost_center"].id,
        total_amount=Decimal(amount),
        status=RequestStatus.DRAFT,
        current_step=0,
    )


class TestGetRequiredApprovals:
    async def test_high_amount_requires_two_steps(self, db, seed_data):
        """Amount >= 1000 should require both tech and financial steps."""
        req = _make_request(seed_data, amount=5000)
        db.add(req)
        await db.flush()
        # Reload with cost_center relationship
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        steps = await engine.get_required_approvals(req)
        assert len(steps) == 2
        assert steps[0].role.name == "Technical Approver"
        assert steps[1].role.name == "Financial Approver"

    async def test_low_amount_requires_one_step(self, db, seed_data):
        """Amount < 1000 should require only tech step."""
        req = _make_request(seed_data, amount=500)
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        steps = await engine.get_required_approvals(req)
        assert len(steps) == 1
        assert steps[0].role.name == "Technical Approver"


class TestGetNextApproverRole:
    async def test_step0_returns_tech(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        req.current_step = 0
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        role = await engine.get_next_approver_role(req)
        assert role is not None
        assert role.name == "Technical Approver"

    async def test_step1_returns_financial(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        req.current_step = 1
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        role = await engine.get_next_approver_role(req)
        assert role is not None
        assert role.name == "Financial Approver"

    async def test_beyond_steps_returns_none(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        req.current_step = 99
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        role = await engine.get_next_approver_role(req)
        assert role is None


class TestDetermineStatusForStep:
    async def test_step0_pending_technical(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        steps = await engine.get_required_approvals(req)
        status = await engine.determine_status_for_step(steps, 0)
        assert status == RequestStatus.PENDING_TECHNICAL

    async def test_step1_pending_financial(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        steps = await engine.get_required_approvals(req)
        status = await engine.determine_status_for_step(steps, 1)
        assert status == RequestStatus.PENDING_FINANCIAL

    async def test_beyond_steps_approved(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        engine = WorkflowEngine(db)
        steps = await engine.get_required_approvals(req)
        status = await engine.determine_status_for_step(steps, 99)
        assert status == RequestStatus.APPROVED


class TestProcessAction:
    async def test_approve_advances_step(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        req.status = RequestStatus.PENDING_TECHNICAL
        req.current_step = 0
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        tech_user = seed_data["users"]["tech"]
        engine = WorkflowEngine(db)
        req = await engine.process_action(req, tech_user, "APPROVE", comment="OK")
        assert req.current_step == 1
        assert req.status == RequestStatus.PENDING_FINANCIAL

    async def test_approve_wrong_role_raises(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        req.status = RequestStatus.PENDING_TECHNICAL
        req.current_step = 0
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        fin_user = seed_data["users"]["financial"]
        engine = WorkflowEngine(db)
        with pytest.raises(PermissionError):
            await engine.process_action(req, fin_user, "APPROVE")

    async def test_reject_sets_rejected(self, db, seed_data):
        req = _make_request(seed_data, amount=5000)
        req.status = RequestStatus.PENDING_TECHNICAL
        req.current_step = 0
        db.add(req)
        await db.flush()
        result = await db.execute(
            select(Request).options(selectinload(Request.cost_center)).where(Request.id == req.id)
        )
        req = result.scalars().first()

        tech_user = seed_data["users"]["tech"]
        engine = WorkflowEngine(db)
        req = await engine.process_action(req, tech_user, "REJECT", comment="Bad")
        assert req.status == RequestStatus.REJECTED
