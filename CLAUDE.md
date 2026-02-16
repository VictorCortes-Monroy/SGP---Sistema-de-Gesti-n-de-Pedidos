# SGP - Sistema de Gestión y Trazabilidad de Solicitudes de Pedido

## Tech Stack
- **Backend**: FastAPI (Python 3.11+) con async/await
- **DB**: PostgreSQL 15 (via Docker)
- **ORM**: SQLAlchemy async con asyncpg
- **Migrations**: Alembic (async)
- **Auth**: JWT (python-jose) + bcrypt (passlib)
- **Validation**: Pydantic v2
- **Infra**: Docker & Docker Compose

## Project Structure
```
app/
├── api/
│   ├── deps.py                  # get_db, get_current_user, require_role, get_client_ip
│   └── api_v1/
│       ├── api.py               # Router aggregation
│       └── endpoints/
│           ├── login.py         # POST /login/access-token
│           ├── users.py         # User CRUD
│           ├── requests.py      # Request lifecycle (create, submit, approve, reject, receive)
│           └── budgets.py       # Budget visibility
├── core/
│   ├── config.py                # Settings (reads from .env)
│   └── security.py              # JWT creation, password hashing
├── db/
│   ├── base.py                  # SQLAlchemy declarative Base
│   └── session.py               # Async engine + session factory
├── models/
│   ├── users.py                 # User, Role
│   ├── organization.py          # Company, CostCenter
│   ├── request.py               # Request, RequestItem, RequestStatus enum
│   ├── budget.py                # Budget, BudgetReservation
│   └── workflow.py              # ApprovalMatrix, WorkflowLog
├── schemas/                     # Pydantic request/response models
│   ├── user.py, request.py, token.py, workflow.py, budget.py
├── services/
│   ├── workflow.py              # WorkflowEngine (approval routing)
│   └── budget_service.py        # Budget reservation/commit/release
└── main.py                      # FastAPI app factory
```

## How to Run
```bash
docker-compose up --build        # Levanta DB + API en localhost:8000
docker-compose exec app alembic upgrade head   # Aplicar migraciones
docker-compose exec app python scripts/initial_data.py  # Seed data
```

## Key Patterns
- **UUIDs** como primary keys en todos los modelos
- **Async sessions**: Todas las queries usan `await db.execute(query)`
- **Eager loading**: Usar `selectinload()` para relaciones (async no soporta lazy load)
- **Pydantic v2**: Schemas con `model_config = ConfigDict(from_attributes=True)`
- **RequestStatus enum**: DRAFT -> PENDING_TECHNICAL -> PENDING_FINANCIAL -> APPROVED -> PURCHASING -> RECEIVED_FULL -> COMPLETED
- **Servicios** se instancian con `db` session: `WorkflowEngine(db)`, `BudgetService(db)`

## Workflow State Machine
```
DRAFT ──submit──> PENDING_TECHNICAL ──approve──> PENDING_FINANCIAL ──approve──> APPROVED
  │                     │                              │
  └──cancel──> CANCELLED  └──reject──> REJECTED <──reject──┘
                                  │
                                  └──resubmit──> DRAFT

APPROVED ──> PURCHASING ──> RECEIVED_PARTIAL/RECEIVED_FULL ──> COMPLETED
```

## Approval Matrix Logic
Routing determinista basado en: **Empresa + Centro de Costo + Monto**
- Monto >= $0: Requiere Aprobador Técnico (step 1)
- Monto >= $1,000: Requiere Aprobador Financiero (step 2)

## Budget Control
- `reserve_funds()`: Bloquea presupuesto al enviar solicitud (DRAFT -> PENDING)
- `commit_funds()`: Mueve de reservado a ejecutado al completar (RECEIVED_FULL -> COMPLETED)
- `release_reservation()`: Libera fondos al rechazar/cancelar
- Available = total_amount - reserved_amount - executed_amount

## Environment Variables
```
POSTGRES_SERVER=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=sgp_db
POSTGRES_PORT=5432
SECRET_KEY=<cambiar-en-produccion>
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## Test Users (seed data)
- `admin@example.com` / `password` (Admin)
- `requester@example.com` / `password` (Solicitante)
- `tech@example.com` / `password` (Aprobador Técnico)
- `financial@example.com` / `password` (Aprobador Financiero)

## API Prefix
Todos los endpoints bajo `/api/v1/`

Cualquier avance ve documentandolo en progreso.md, el objetivo es ir armando un paso a paso.