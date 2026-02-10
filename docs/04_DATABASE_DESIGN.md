# 04. Database Design

## Schema Overview

The database uses PostgreSQL with UUIDs as primary keys.

### Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ requests : "creates"
    users ||--o{ workflow_logs : "performs"
    roles ||--o{ users : "assigned_to"
    roles ||--o{ approval_matrix : "defined_in"
    
    companies ||--o{ cost_centers : "owns"
    companies ||--o{ approval_matrix : "scopes"
    
    cost_centers ||--o{ requests : "funds"
    cost_centers ||--|{ budgets : "has"
    cost_centers ||--o{ approval_matrix : "scopes"
    
    requests ||--o{ request_items : "contains"
    requests ||--o{ workflow_logs : "tracks"
    requests ||--o{ budget_reservations : "reserves"
    
    budgets ||--o{ budget_reservations : "tracks"

    users {
        uuid id PK
        string email
        string hashed_password
        uuid role_id FK
    }

    roles {
        uuid id PK
        string name
    }

    companies {
        uuid id PK
        string name
        string tax_id
    }

    cost_centers {
        uuid id PK
        string name
        string code
        uuid company_id FK
    }

    requests {
        uuid id PK
        string title
        uuid requester_id FK
        uuid cost_center_id FK
        enum status
        numeric total_amount
    }

    request_items {
        uuid id PK
        uuid request_id FK
        string sku
        numeric quantity
        numeric unit_price
    }

    budgets {
        uuid id PK
        uuid cost_center_id FK
        int year
        numeric total_amount
        numeric reserved_amount
        numeric executed_amount
    }

    approval_matrix {
        uuid id PK
        uuid company_id FK
        uuid cost_center_id FK
        numeric min_amount
        numeric max_amount
        uuid role_id FK
        int step_order
    }
```

## Key Table Definitions

### 1. Users & Auth
- **users**: System users.
- **roles**: Defines permissions (e.g., Administrator, Requester, Approver).

### 2. Organization
- **companies**: Legal entities.
- **cost_centers**: Budget units. linked to a specific company.

### 3. Core Workflow
- **requests**: The header of a purchase request.
- **request_items**: Line items (SKU, Qty, Price).
- **workflow_logs**: Immutable history of actions on a request.
- **approval_matrix**: Configuration table that determines *who* approves *what*.

### 4. Finance
- **budgets**: Yearly budget per Cost Center.
- **budget_reservations**: Link table to lock funds for specific requests.
