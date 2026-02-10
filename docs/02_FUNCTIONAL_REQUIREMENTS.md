# 02. Functional Requirements

## A. Deterministic Workflow Engine (Workflow Engine)

### Automatic Routing
The system assigns approvers based *strictly* on a matrix:
`Company + Cost Center + Amount -> Approver Role`

The user **never** chooses the approver manually.

### Role Hierarchy
Defined roles with granular permissions:
-   **Requester**: Can create drafts and submit requests.
-   **Technical Approver**: Validates technical specifications (SKUs, quantities).
-   **Financial Approver**: Validates budget alignment.
-   **Purchasing**: Executes the purchase after final approval.

## B. Visibility & Traceability (Audit Trail)

### Visual Lifecycle (Track & Trace)
An interface for the requester showing the current step of the request (e.g., "Pending Financial Approval").

### Immutable Logs
An audit trail capturing every state change:
-   **Who**: User ID / Role
-   **When**: UTC Timestamp
-   **Action**: Approved / Rejected / Commented
-   **Context**: IP Address

### Reception Module
Mandatory "Confirmation of Receipt" step to close the cycle. The request is not `COMPLETED` until the requester or authorized personnel confirms receipt.

## C. Preventive Financial Control

### Budget Validation
Real-time check of `Budget.total_amount - (Budget.executed_amount + Budget.reserved_amount)` before allowing a request to proceed.

### Funds Reservation (Pre-Commitment)
When a request is sent for approval (or reaches a specific state), the estimated amount is added to `Budget.reserved_amount`.
-   If Approved -> Moves to `executed_amount` (upon payment/PO) or stays reserved until PO.
-   If Rejected -> Returns to available pool (subtracted from `reserved_amount`).
