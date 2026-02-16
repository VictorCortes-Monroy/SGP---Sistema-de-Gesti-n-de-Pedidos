import pytest
import uuid
from decimal import Decimal
from sqlalchemy import select

from app.services.budget_service import BudgetService
from app.models.request import Request, RequestStatus
from app.models.budget import Budget, BudgetReservation
from app.models.organization import CostCenter


class TestGetBudget:
    async def test_get_existing_budget(self, db, seed_data):
        svc = BudgetService(db)
        budget = await svc.get_budget(seed_data["cost_center"].id)
        assert budget is not None
        assert float(budget.total_amount) == 50000.0

    async def test_get_nonexistent_budget(self, db, seed_data):
        svc = BudgetService(db)
        budget = await svc.get_budget(uuid.uuid4())
        assert budget is None


class TestCheckAvailability:
    async def test_sufficient_funds(self, db, seed_data):
        svc = BudgetService(db)
        ok = await svc.check_availability(seed_data["cost_center"].id, Decimal("10000"))
        assert ok is True

    async def test_insufficient_funds(self, db, seed_data):
        svc = BudgetService(db)
        ok = await svc.check_availability(seed_data["cost_center"].id, Decimal("60000"))
        assert ok is False

    async def test_no_budget_returns_false(self, db, seed_data):
        svc = BudgetService(db)
        ok = await svc.check_availability(uuid.uuid4(), Decimal("100"))
        assert ok is False


class TestReserveFunds:
    async def test_reserve_success(self, db, seed_data):
        req = Request(
            title="Reserve Test",
            requester_id=seed_data["users"]["requester"].id,
            cost_center_id=seed_data["cost_center"].id,
            total_amount=Decimal("5000"),
            status=RequestStatus.DRAFT,
        )
        db.add(req)
        await db.flush()

        svc = BudgetService(db)
        await svc.reserve_funds(req)

        budget = await svc.get_budget(seed_data["cost_center"].id)
        assert float(budget.reserved_amount) == 5000.0

        # Reservation record created
        result = await db.execute(
            select(BudgetReservation).where(BudgetReservation.request_id == req.id)
        )
        assert result.scalars().first() is not None

    async def test_reserve_insufficient_raises(self, db, seed_data):
        req = Request(
            title="Too Expensive",
            requester_id=seed_data["users"]["requester"].id,
            cost_center_id=seed_data["cost_center"].id,
            total_amount=Decimal("60000"),
            status=RequestStatus.DRAFT,
        )
        db.add(req)
        await db.flush()

        svc = BudgetService(db)
        with pytest.raises(ValueError, match="Insufficient funds"):
            await svc.reserve_funds(req)

    async def test_reserve_no_budget_raises(self, db, seed_data):
        # Create CC without budget
        cc2 = CostCenter(name="NoBudget", code="NB-001", company_id=seed_data["company"].id)
        db.add(cc2)
        await db.flush()

        req = Request(
            title="No Budget",
            requester_id=seed_data["users"]["requester"].id,
            cost_center_id=cc2.id,
            total_amount=Decimal("100"),
            status=RequestStatus.DRAFT,
        )
        db.add(req)
        await db.flush()

        svc = BudgetService(db)
        with pytest.raises(ValueError, match="Budget not found"):
            await svc.reserve_funds(req)


class TestCommitFunds:
    async def test_commit_moves_to_executed(self, db, seed_data):
        req = Request(
            title="Commit Test",
            requester_id=seed_data["users"]["requester"].id,
            cost_center_id=seed_data["cost_center"].id,
            total_amount=Decimal("3000"),
            status=RequestStatus.DRAFT,
        )
        db.add(req)
        await db.flush()

        svc = BudgetService(db)
        await svc.reserve_funds(req)
        await svc.commit_funds(req)

        budget = await svc.get_budget(seed_data["cost_center"].id)
        assert float(budget.reserved_amount) == 0.0
        assert float(budget.executed_amount) == 3000.0


class TestReleaseReservation:
    async def test_release_returns_to_zero(self, db, seed_data):
        req = Request(
            title="Release Test",
            requester_id=seed_data["users"]["requester"].id,
            cost_center_id=seed_data["cost_center"].id,
            total_amount=Decimal("4000"),
            status=RequestStatus.DRAFT,
        )
        db.add(req)
        await db.flush()

        svc = BudgetService(db)
        await svc.reserve_funds(req)
        assert float((await svc.get_budget(seed_data["cost_center"].id)).reserved_amount) == 4000.0

        await svc.release_reservation(req)
        budget = await svc.get_budget(seed_data["cost_center"].id)
        assert float(budget.reserved_amount) == 0.0

    async def test_release_without_reservation_is_noop(self, db, seed_data):
        """Releasing a request with no reservation should not error."""
        req = Request(
            title="No Reservation",
            requester_id=seed_data["users"]["requester"].id,
            cost_center_id=seed_data["cost_center"].id,
            total_amount=Decimal("1000"),
            status=RequestStatus.DRAFT,
        )
        db.add(req)
        await db.flush()

        svc = BudgetService(db)
        await svc.release_reservation(req)  # Should not raise
