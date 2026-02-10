from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.budget import Budget, BudgetReservation
from app.models.request import Request
from decimal import Decimal

class BudgetService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_budget(self, cost_center_id) -> Budget:
        query = select(Budget).where(Budget.cost_center_id == cost_center_id)
        result = await self.db.execute(query)
        budget = result.scalars().first()
        return budget

    async def check_availability(self, cost_center_id, amount: Decimal) -> bool:
        budget = await self.get_budget(cost_center_id)
        if not budget:
            return False # No budget defined = No money
        
        available = budget.total_amount - budget.reserved_amount - budget.executed_amount
        return available >= amount

    async def reserve_funds(self, request: Request):
        """
        Creates a reservation for the request amount.
        Should be called when moving from DRAFT to PENDING.
        """
        budget = await self.get_budget(request.cost_center_id)
        if not budget:
             raise ValueError("Budget not found for this Cost Center")
        
        # Double check availability with lock potentially, but for now simple check
        available = budget.total_amount - budget.reserved_amount - budget.executed_amount
        if available < request.total_amount:
            raise ValueError(f"Insufficient funds. Available: {available}, Required: {request.total_amount}")
            
        # Create Reservation
        reservation = BudgetReservation(
            budget_id=budget.id,
            request_id=request.id,
            amount=request.total_amount
        )
        self.db.add(reservation)
        
        # Update Budget Aggregate (Denormalization for speed)
        budget.reserved_amount += request.total_amount
        # db.add(budget) # Already attached to session
        
        await self.db.commit()

    async def commit_funds(self, request: Request):
        """
        Moves funds from Reserved to Executed.
        Called when Request is COMPLETED/PAID.
        """
        budget = await self.get_budget(request.cost_center_id)
        # Find reservation
        query = select(BudgetReservation).where(BudgetReservation.request_id == request.id)
        result = await self.db.execute(query)
        reservation = result.scalars().first()
        
        if reservation:
            amount = reservation.amount
            await self.db.delete(reservation)
            
            budget.reserved_amount -= amount
            budget.executed_amount += amount
            
            await self.db.commit()

    async def release_reservation(self, request: Request):
        """
        Called when Request is REJECTED or CANCELLED.
        """
        budget = await self.get_budget(request.cost_center_id)
        query = select(BudgetReservation).where(BudgetReservation.request_id == request.id)
        result = await self.db.execute(query)
        reservation = result.scalars().first()
        
        if reservation:
            amount = reservation.amount
            await self.db.delete(reservation)
            budget.reserved_amount -= amount
            await self.db.commit()
