"""
POWorkflowService — manages financial approval lifecycle for Purchase Orders.

Threshold rules (configurable via settings):
  total_amount_CLP < OC_FINANCE_1_THRESHOLD  → AUTHORIZED immediately
  OC_FINANCE_1_THRESHOLD ≤ amount < OC_FINANCE_2_THRESHOLD → PENDING_FINANCE_1
  amount >= OC_FINANCE_2_THRESHOLD            → PENDING_FINANCE_1 → PENDING_FINANCE_2

Approver roles:
  PENDING_FINANCE_1 → "Financial Approver" (Finance 1)
  PENDING_FINANCE_2 → "Finance 2"           (General Manager)
  Admin can approve at any level.
"""
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.purchase_order import PurchaseOrder, PurchaseOrderStatus, POApprovalLog
from app.models.users import User

# Role names mapped to finance level
FINANCE_LEVEL_ROLES = {
    1: "Financial Approver",
    2: "Finance 2",
}


def _normalize_to_clp(amount: Decimal, currency: str) -> Decimal:
    """Convert an amount to CLP equivalent for threshold comparison."""
    currency = (currency or "CLP").upper()
    fx_map = {
        "CLP": Decimal("1"),
        "USD": Decimal(str(settings.OC_FX_USD_TO_CLP)),
        "EUR": Decimal(str(settings.OC_FX_EUR_TO_CLP)),
    }
    rate = fx_map.get(currency, Decimal("1"))
    return Decimal(str(amount)) * rate


def get_po_initial_status(po: PurchaseOrder) -> PurchaseOrderStatus:
    """Determine the initial status of a newly created PO based on its total amount."""
    clp_amount = _normalize_to_clp(po.total_amount, po.currency)
    t1 = Decimal(str(settings.OC_FINANCE_1_THRESHOLD))
    t2 = Decimal(str(settings.OC_FINANCE_2_THRESHOLD))

    if clp_amount < t1:
        return PurchaseOrderStatus.AUTHORIZED
    else:
        # Both 1M–5M and ≥5M start at PENDING_FINANCE_1
        return PurchaseOrderStatus.PENDING_FINANCE_1


def _requires_finance_2(po: PurchaseOrder) -> bool:
    clp_amount = _normalize_to_clp(po.total_amount, po.currency)
    return clp_amount >= Decimal(str(settings.OC_FINANCE_2_THRESHOLD))


class POWorkflowService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def get_initial_status(self, po: PurchaseOrder) -> PurchaseOrderStatus:
        return get_po_initial_status(po)

    def _get_required_role(self, status: PurchaseOrderStatus) -> tuple[str, int]:
        """Returns (role_name, finance_level) for a given pending status."""
        if status == PurchaseOrderStatus.PENDING_FINANCE_1:
            return FINANCE_LEVEL_ROLES[1], 1
        elif status == PurchaseOrderStatus.PENDING_FINANCE_2:
            return FINANCE_LEVEL_ROLES[2], 2
        raise ValueError(f"OC en estado '{status}' no requiere aprobación financiera.")

    def _check_permission(self, user: User, required_role: str) -> None:
        role_name = user.role.name if user.role else None
        if role_name != required_role and role_name != "Admin":
            raise PermissionError(
                f"Solo el rol '{required_role}' puede realizar esta acción (estado actual requiere ese rol)."
            )

    async def approve(
        self,
        po: PurchaseOrder,
        user: User,
        comment: str | None = None,
        ip_address: str | None = None,
    ) -> PurchaseOrder:
        """Finance 1 or Finance 2 approves the OC."""
        required_role, finance_level = self._get_required_role(po.status)
        self._check_permission(user, required_role)

        from_status = po.status

        if po.status == PurchaseOrderStatus.PENDING_FINANCE_1:
            new_status = (
                PurchaseOrderStatus.PENDING_FINANCE_2
                if _requires_finance_2(po)
                else PurchaseOrderStatus.AUTHORIZED
            )
        else:  # PENDING_FINANCE_2
            new_status = PurchaseOrderStatus.AUTHORIZED

        po.status = new_status
        self.db.add(POApprovalLog(
            po_id=po.id,
            actor_id=user.id,
            action="APPROVE",
            finance_level=finance_level,
            from_status=from_status.value,
            to_status=new_status.value,
            comment=comment,
            ip_address=ip_address,
        ))
        await self.db.commit()
        await self.db.refresh(po)
        return po

    async def reject(
        self,
        po: PurchaseOrder,
        user: User,
        comment: str | None = None,
        ip_address: str | None = None,
    ) -> PurchaseOrder:
        """Finance 1 or Finance 2 rejects the OC — returns it to DRAFT for Purchasing."""
        required_role, finance_level = self._get_required_role(po.status)
        self._check_permission(user, required_role)

        from_status = po.status
        po.status = PurchaseOrderStatus.DRAFT

        self.db.add(POApprovalLog(
            po_id=po.id,
            actor_id=user.id,
            action="REJECT",
            finance_level=finance_level,
            from_status=from_status.value,
            to_status=PurchaseOrderStatus.DRAFT.value,
            comment=comment,
            ip_address=ip_address,
        ))
        await self.db.commit()
        await self.db.refresh(po)
        return po

    async def resubmit(
        self,
        po: PurchaseOrder,
        user: User,
        ip_address: str | None = None,
    ) -> PurchaseOrder:
        """Purchasing resubmits a DRAFT OC (after rejection) without changing its OC number."""
        if po.status != PurchaseOrderStatus.DRAFT:
            raise ValueError("Solo una OC en estado DRAFT puede ser reenviada a aprobación.")

        role_name = user.role.name if user.role else None
        if role_name not in ("Purchasing", "Admin"):
            raise PermissionError("Solo Compras o Admin pueden reenviar una OC a aprobación.")

        from_status = po.status
        new_status = get_po_initial_status(po)
        po.status = new_status

        self.db.add(POApprovalLog(
            po_id=po.id,
            actor_id=user.id,
            action="RESUBMITTED",
            finance_level=0,
            from_status=from_status.value,
            to_status=new_status.value,
            ip_address=ip_address,
        ))
        await self.db.commit()
        await self.db.refresh(po)
        return po
