from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from app.models.request import Request, RequestItem, RequestStatus
from app.models.workflow import ApprovalMatrix, WorkflowLog
from app.models.users import User, Role
from app.models.maintenance.request import MaintRequest


# Map role names to the PENDING status that corresponds to their approval step
ROLE_TO_PENDING_STATUS = {
    "Technical Approver": RequestStatus.PENDING_TECHNICAL,
    # "Financial Approver" removed — financial approval now lives on the Purchase Order
}


class WorkflowEngine:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_required_approvals(self, request: Request) -> List[ApprovalMatrix]:
        """
        Determines the list of approval steps required for a request
        based on its attributes (Company, CostCenter, Amount).
        """
        query = select(ApprovalMatrix).options(
            selectinload(ApprovalMatrix.role)
        ).where(
            and_(
                or_(ApprovalMatrix.company_id == None, ApprovalMatrix.company_id == request.cost_center.company_id),
                or_(ApprovalMatrix.cost_center_id == None, ApprovalMatrix.cost_center_id == request.cost_center_id),
                ApprovalMatrix.min_amount <= request.total_amount,
                or_(ApprovalMatrix.max_amount == None, ApprovalMatrix.max_amount >= request.total_amount)
            )
        ).order_by(ApprovalMatrix.step_order)

        result = await self.db.execute(query)
        steps = result.scalars().all()
        return steps

    async def get_next_approver_role(self, request: Request) -> Optional[Role]:
        """Get the role required for the current approval step."""
        steps = await self.get_required_approvals(request)

        if request.current_step < len(steps):
            return steps[request.current_step].role
        return None

    async def determine_status_for_step(self, steps: List[ApprovalMatrix], step_index: int) -> RequestStatus:
        """Given the list of approval steps and a step index, return the corresponding status."""
        if step_index >= len(steps):
            return RequestStatus.APPROVED

        step = steps[step_index]
        role = step.role
        if not role:
            role_query = select(Role).where(Role.id == step.role_id)
            result = await self.db.execute(role_query)
            role = result.scalars().first()

        return ROLE_TO_PENDING_STATUS.get(role.name, RequestStatus.PENDING_TECHNICAL)

    async def process_action(
        self,
        request: Request,
        user: User,
        action: str,
        comment: str = None,
        ip_address: str = None
    ) -> Request:
        """
        Handle Approve/Reject actions.
        Validates role, advances workflow step, updates status, creates audit log.
        """
        if action == "APPROVE":
            next_role = await self.get_next_approver_role(request)

            if not next_role:
                raise ValueError("No approval required currently.")

            if user.role_id != next_role.id:
                raise PermissionError("User does not have the required role.")

            steps = await self.get_required_approvals(request)
            from_status = request.status

            # Advance step
            request.current_step += 1

            # Determine new status based on next step's role
            new_status = await self.determine_status_for_step(steps, request.current_step)
            request.status = new_status

            # Create audit log
            log = WorkflowLog(
                request_id=request.id,
                actor_id=user.id,
                action="APPROVE",
                from_status=from_status.value if hasattr(from_status, 'value') else str(from_status),
                to_status=new_status.value if hasattr(new_status, 'value') else str(new_status),
                comment=comment,
                ip_address=ip_address
            )
            self.db.add(log)

        elif action == "REJECT":
            from_status = request.status
            request.status = RequestStatus.REJECTED

            log = WorkflowLog(
                request_id=request.id,
                actor_id=user.id,
                action="REJECT",
                from_status=from_status.value if hasattr(from_status, 'value') else str(from_status),
                to_status=RequestStatus.REJECTED.value,
                comment=comment,
                ip_address=ip_address
            )
            self.db.add(log)

        await self.db.commit()
        await self.db.refresh(request)
        return request

    async def create_purchase_request_from_sm(
        self,
        sm: MaintRequest,
        actor_id: str,
        cost_center_id: str,
    ) -> Request:
        """
        Creates an SGP Purchase Request from an approved Maintenance Request.
        """
        title = f"Mantención: {sm.equipment.name} ({sm.equipment.code})"
        # Fallback to an estimated 1.0 if not provided
        estimated_cost = sm.estimated_cost or 1.0
        
        # Create the purchase request
        new_request = Request(
            title=title,
            description=sm.description,
            requester_id=actor_id,
            cost_center_id=cost_center_id,
            total_amount=estimated_cost,
            currency=sm.currency,
            status=RequestStatus.DRAFT,
            current_step=0,
        )
        self.db.add(new_request)
        await self.db.flush()
        
        # Create the request item (we assume 1 service item)
        item = RequestItem(
            request_id=new_request.id,
            description=f"Servicio de mantención {sm.maintenance_type.value} para equipo {sm.equipment.code}",
            sku="SERV-MANT-01",
            quantity=1.0,
            unit_price=estimated_cost,
            total_price=estimated_cost,
        )
        self.db.add(item)
        await self.db.flush()
        
        return new_request
