# SGP - Sistema de Gestión de Pedidos

Welcome to the SGP (Sistema de Gestión y Trazabilidad de Solicitudes de Pedido) project.

## Documentation

Full project documentation is available in the `docs/` folder:

1. [Visión y Alcance (No-Técnico)](docs/00_VISION_Y_ALCANCE.md) - **Start Here**: Business rules, roles, and scope (Spanish).
2. [General Overview](docs/01_GENERAL_OVERVIEW.md) - Project objectives and problem statement.
3. [Functional Requirements](docs/02_FUNCTIONAL_REQUIREMENTS.md) - Detailed behavior of the system.
4. [Technical Architecture](docs/03_TECHNICAL_ARCHITECTURE.md) - Stack, security, and structure.
5. [Database Design](docs/04_DATABASE_DESIGN.md) - ERD and schema details.
6. [Workflow Design](docs/05_WORKFLOW_DESIGN.md) - State machines and approval logic.

## Quick Start

### Prerequisites
- Python 3.10+
- Docker & Docker Compose

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start application
uvicorn app.main:app --reload
```
