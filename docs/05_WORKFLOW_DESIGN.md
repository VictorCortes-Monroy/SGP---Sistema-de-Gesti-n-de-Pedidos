# 05. Workflow Design

## State Machine Definition

The `Request` lifecycle is governed by a strict state machine defined in `RequestStatus`.

### Status Flow Diagram

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_TECHNICAL: Submit for Approval
    
    state "Approval Chain" as Approval {
        PENDING_TECHNICAL --> PENDING_FINANCIAL: Technical Data Validated
        PENDING_FINANCIAL --> APPROVED: Budget & Compliance Validated
        
        PENDING_TECHNICAL --> REJECTED: Invalid Specs
        PENDING_FINANCIAL --> REJECTED: No Budget / Policy Violation
    }
    
    APPROVED --> PURCHASING: Sent to Purchasing Dept
    PURCHASING --> RECEIVED_PARTIAL: Goods Arriving
    PURCHASING --> RECEIVED_FULL: All Goods Arrived
    
    RECEIVED_PARTIAL --> RECEIVED_FULL
    
    RECEIVED_FULL --> COMPLETED: Final Close (Sign-off)
    
    REJECTED --> DRAFT: Edit & Resubmit
    DRAFT --> CANCELLED: User Cancels
    
    COMPLETED --> [*]
    CANCELLED --> [*]
```

## Approval Matrix Logic

The logic to move from `PENDING_TECHNICAL` to `PENDING_FINANCIAL` (or other potential intermediate steps) is data-driven.

**Pseudo-code for determining next approver:**
```python
def get_next_approvers(request):
    return query(ApprovalMatrix).filter(
        (ApprovalMatrix.company_id == request.cost_center.company_id) | (ApprovalMatrix.company_id == None),
        (ApprovalMatrix.cost_center_id == request.cost_center_id) | (ApprovalMatrix.cost_center_id == None),
        ApprovalMatrix.min_amount <= request.total_amount,
        (ApprovalMatrix.max_amount >= request.total_amount) | (ApprovalMatrix.max_amount == None)
    ).order_by(ApprovalMatrix.step_order).all()
```

This ensures that:
1.  Global rules (Company=Null) apply unless specific overrides exist.
2.  Amount thresholds trigger different seniority levels (e.g., > $10k needs VP approval).
