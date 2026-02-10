# SGP - Progreso de Implementación

## REALIZADO

### FASE 0: Configuración Base
- [x] **CLAUDE.md** creado con guía completa del proyecto
- [x] **requirements.txt** corregido: `pyjwt` reemplazado por `python-jose[cryptography]`, agregado `httpx`, extras en `uvicorn[standard]` y `sqlalchemy[asyncio]`
- [x] **.env** y **.env.example** creados con variables de entorno
- [x] **.gitignore** creado
- [x] **SECRET_KEY** corregido en `app/core/config.py` (agregado al Settings), `app/core/security.py` y `app/api/deps.py` (ya no está hardcodeado)
- [x] **ACCESS_TOKEN_EXPIRE_MINUTES** agregado al Settings

### FASE 1: Infraestructura Docker
- [x] **Dockerfile** creado (Python 3.11-slim, gcc + libpq-dev, uvicorn)
- [x] **alembic.ini** creado
- [x] **alembic/script.py.mako** creado (template de migraciones)
- [x] **alembic/versions/** directorio creado
- [x] **docker-compose.yml** actualizado: servicio `app` agregado con healthcheck en DB, env_file, comando `alembic upgrade head && uvicorn`
- [x] **CORS middleware** agregado en `app/main.py`
- [x] **Endpoint /health** agregado en `app/main.py`

### FASE 2: Motor de Workflow Completo
- [x] **app/schemas/workflow.py** creado: `WorkflowAction`, `WorkflowLogResponse`, `RequestTimeline`, `ReceptionInput`
- [x] **app/api/deps.py** actualizado: `require_role()` factory, `get_client_ip()` helper, `selectinload` en `get_current_user`
- [x] **app/services/workflow.py** corregido:
  - Mapeo `ROLE_TO_PENDING_STATUS` para transiciones dinámicas
  - `determine_status_for_step()` nuevo método
  - `process_action()` ahora actualiza status entre pasos (PENDING_TECHNICAL -> PENDING_FINANCIAL -> APPROVED)
  - Logging con `to_status`, `ip_address`
  - `selectinload` en `get_required_approvals` para cargar roles
- [x] **app/schemas/request.py** actualizado: `RequestDetail` con logs, `current_step`, `updated_at`, migrado a `ConfigDict`
- [x] **app/api/api_v1/endpoints/requests.py** reescrito completo:
  - `POST /requests/` - Crear solicitud (corregido con flush + eager load)
  - `POST /requests/{id}/submit` - Enviar a aprobación (status dinámico, validación DRAFT, WorkflowLog, IP)
  - `POST /requests/{id}/approve` - Aprobar solicitud
  - `POST /requests/{id}/reject` - Rechazar + liberar presupuesto
  - `GET /requests/` - Listar filtrado por rol
  - `GET /requests/{id}` - Detalle con audit trail
  - `GET /requests/{id}/timeline` - Track & Trace
  - `POST /requests/{id}/receive` - Recepción parcial/total + commit de fondos

### FASE 3: Presupuestos
- [x] **app/schemas/budget.py** creado: `BudgetResponse` con `available_amount` calculado
- [x] **app/api/api_v1/endpoints/budgets.py** creado: `GET /budgets/`, `GET /budgets/{cost_center_id}`
- [x] **app/api/api_v1/api.py** actualizado: router de budgets registrado

### Fixes Adicionales
- [x] **app/models/workflow.py** - `Integer` import movido al inicio del archivo (estaba después de su uso)
- [x] **app/db/session.py** - `echo=False` (estaba en True, logueaba todas las queries SQL)

---

## PENDIENTE

### Verificación Docker - COMPLETADA
- [x] `docker-compose build` - Imagen construida OK
- [x] `docker-compose up` - DB + API levantados OK
- [x] Migración generada: `alembic revision --autogenerate -m "initial_schema"` (10 tablas detectadas)
- [x] Migración aplicada: `alembic upgrade head`
- [x] Seed ejecutado: 4 roles, 4 usuarios, 1 empresa, 1 CC, 1 presupuesto, 2 reglas de aprobación
- [x] **Flujo E2E probado exitosamente:**
  1. Login requester → token JWT OK
  2. GET /users/me → perfil con role_name OK
  3. POST /requests/ → DRAFT ($4,500) OK
  4. POST /requests/{id}/submit → PENDING_TECHNICAL + reserva presupuesto OK
  5. Login tech → POST /approve → PENDING_FINANCIAL OK
  6. Login financial → POST /approve → APPROVED OK
  7. POST /requests/{id}/receive → COMPLETED + commit fondos OK
  8. GET /timeline → 4 logs de auditoría OK
  9. GET /budgets/ → $5,500 disponible, $4,500 ejecutado OK
  10. POST /requests/{id}/cancel → CANCELLED OK
  11. Login admin → GET /users/ → 4 usuarios listados OK

### Fix aplicado durante verificación
- **bcrypt==4.0.1** fijado en requirements.txt (passlib incompatible con bcrypt >= 4.1)

### FASE 4: Administración
- [x] **CRUD empresas y centros de costo**
  - `app/schemas/organization.py` creado: `CompanyCreate`, `CompanyUpdate`, `CompanyResponse`, `CompanyDetail`, `CostCenterCreate`, `CostCenterUpdate`, `CostCenterResponse`
  - `app/api/api_v1/endpoints/organizations.py` creado: CRUD completo para Company y CostCenter
  - Endpoints: `GET/POST /organizations/companies`, `GET/PUT/DELETE /organizations/companies/{id}`, `GET/POST /organizations/cost-centers`, `GET/PUT/DELETE /organizations/cost-centers/{id}`
- [x] **CRUD matriz de aprobación**
  - `app/schemas/approval_matrix.py` creado: `ApprovalMatrixCreate`, `ApprovalMatrixUpdate`, `ApprovalMatrixResponse`
  - `app/api/api_v1/endpoints/approval_matrix.py` creado: CRUD completo con filtros por company/cost_center
  - Endpoints: `GET/POST /approval-matrix/`, `GET/PUT/DELETE /approval-matrix/{id}`
- [x] **Endpoints de usuarios completos**
  - `GET /users/me` - Perfil del usuario autenticado
  - `PUT /users/me` - Actualizar perfil propio (no puede cambiar rol)
  - `GET /users/` - Listar todos los usuarios
  - `GET /users/{id}` - Detalle de usuario
  - `PUT /users/{id}` - Actualizar usuario (Admin)
  - `DELETE /users/{id}` - Soft delete usuario (Admin)
  - `app/schemas/user.py` actualizado: migrado a `ConfigDict`, `role_name` en response
- [x] **Proteger POST /users/ con autenticación admin**
  - `POST /users/` requiere rol "Admin" via `require_role("Admin")`
  - `PUT /users/{id}` requiere rol "Admin"
  - `DELETE /users/{id}` requiere rol "Admin"
- [x] **Soft delete en User y Request**
  - `app/models/users.py`: campos `is_deleted`, `deleted_at` agregados
  - `app/models/request.py`: campos `is_deleted`, `deleted_at` agregados
  - Queries filtran `is_deleted == False` en listados y carga
  - `app/api/deps.py`: `get_current_user` bloquea usuarios soft-deleted
- [x] **Endpoint de cancelación de solicitudes**
  - `POST /requests/{id}/cancel` - Solo el solicitante puede cancelar
  - Válido en estados: DRAFT, PENDING_TECHNICAL, PENDING_FINANCIAL
  - Libera presupuesto reservado si aplica
  - Crea WorkflowLog con acción "CANCELLED"
- [x] **Soft delete de solicitudes**
  - `DELETE /requests/{id}` - Solo DRAFT o CANCELLED pueden eliminarse
- [x] **Rol Admin + usuario admin en seed data**
  - Rol "Admin" agregado a `scripts/initial_data.py`
  - Usuario `admin@example.com` / `password` (Admin)
- [x] **Routers registrados** en `app/api/api_v1/api.py`: organizations + approval-matrix

### FASE 4: Pendiente
- [ ] Tests automatizados (pytest + pytest-asyncio)

---

## Archivos Creados
```
CLAUDE.md
PROGRESO.md
.env
.env.example
.gitignore
Dockerfile
alembic.ini
alembic/script.py.mako
alembic/versions/                          (directorio vacío)
app/schemas/workflow.py
app/schemas/budget.py
app/schemas/organization.py                ← NUEVO (Fase 4)
app/schemas/approval_matrix.py             ← NUEVO (Fase 4)
app/api/api_v1/endpoints/budgets.py
app/api/api_v1/endpoints/organizations.py  ← NUEVO (Fase 4)
app/api/api_v1/endpoints/approval_matrix.py ← NUEVO (Fase 4)
```

## Archivos Modificados
```
requirements.txt
docker-compose.yml
app/main.py
app/core/config.py
app/core/security.py
app/db/session.py
app/api/deps.py                            ← Soft delete check
app/api/api_v1/api.py                      ← +2 routers
app/api/api_v1/endpoints/requests.py       ← +cancel, +delete, +is_deleted filter
app/api/api_v1/endpoints/users.py          ← Reescrito completo (CRUD + admin)
app/schemas/request.py
app/schemas/user.py                        ← ConfigDict + role_name + UserUpdate
app/services/workflow.py
app/models/workflow.py
app/models/users.py                        ← +is_deleted, +deleted_at
app/models/request.py                      ← +is_deleted, +deleted_at
scripts/initial_data.py                    ← +Admin role, +admin user
```

## Test Users (seed data)
| Email | Password | Rol |
|-------|----------|-----|
| `admin@example.com` | `password` | Admin |
| `requester@example.com` | `password` | Requester |
| `tech@example.com` | `password` | Technical Approver |
| `financial@example.com` | `password` | Financial Approver |
