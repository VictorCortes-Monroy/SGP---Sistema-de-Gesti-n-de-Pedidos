# 03. Technical Architecture

## Stack Overview
-   **Backend**: Python 3.10+ with **FastAPI**.
-   **Database**: **PostgreSQL** (14+).
-   **ORM**: SQLAlchemy (Async).
-   **Migration Tool**: Alembic.
-   **Containerization**: Docker & Docker Compose.

## Security Principles
1.  **Authentication**: JWT (JSON Web Tokens) for stateless authentication.
2.  **Password Hashing**: Bcrypt or Argon2.
3.  **Input Validation**: Pydantic models for strict schema validation.
4.  **Soft Deletes**: Major entities (`Requests`, `Users`) should support soft deletion to maintain historical integrity.

## Data Integrity strategies
-   **UUIDs**: All primary keys are UUIDv4 to prevent enumeration attacks and allow easy data merging/migration.
-   **Foreign Keys**: Strict relational integrity enforced at the DB level.
-   **Transactions**: Critical operations (e.g., Approving a request + Updating Budget) must be atomic transactions.

## API Structure
RESTful design:
-   `GET /requests`: List requests (filtered by user role).
-   `POST /requests`: Create a new draft.
-   `POST /requests/{id}/approve`: Trigger an approval action.
-   `GET /audit/{request_id}`: Retrieve the immutable log.
