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

### FASE 5: Testing & QA - COMPLETADA ✅
- [x] **112 tests pasando** (arriba de 41 originales)
- [x] **Cobertura: 94%** (objetivo 80%) - `.coveragerc` con `concurrency=greenlet` para async
- [x] **pytest-cov** configurado en `pytest.ini` con `--cov=app --cov-report=term-missing`
- [x] **Fixture query_counter** para detección N+1 (SQLAlchemy `before_cursor_execute` event)
- [x] **Tests de performance** (3 tests N+1: list requests ≤6, list users ≤5, request detail ≤8 queries)
- [x] **Tests de servicios directos**: WorkflowEngine (10 tests), BudgetService (11 tests)
- [x] **Tests de seguridad**: Password hashing (3), JWT creation (2)
- [x] **Tests de health**: GET / y GET /health (2 tests)
- [x] **Tests de error handling expandidos**: Auth (+3), Requests (+12), Organizations (+7)
- [x] Archivos nuevos: `test_security.py`, `test_health.py`, `test_workflow_service.py`, `test_budget_service.py`, `test_performance.py`

### FASE 6: Features Funcionales Adicionales - COMPLETADA ✅
- [x] **Sistema de comentarios** en solicitudes
  - Modelo `Comment` (`app/models/comment.py`)
  - Schemas `CommentCreate`, `CommentResponse` (`app/schemas/comment.py`)
  - Endpoints: `POST /requests/{id}/comments`, `GET /requests/{id}/comments`
  - Tests: 4 tests en `test_comments.py`
- [x] **Paginación** en todos los listados (offset/limit)
  - Schema genérico `PaginatedResponse[T]` (`app/schemas/pagination.py`)
  - Aplicado a: requests, users, budgets, companies, cost-centers, approval-matrix
  - Tests: 6 tests en `test_pagination.py` (estructura + skip/limit)
- [x] **Filtros avanzados** en `GET /requests/` (status, fecha, monto, CC)
  - Helpers: `_build_role_filter()`, `_apply_filters()` extraídos
  - Admin ve todas las solicitudes
  - Tests: 8 tests en `test_filters.py` (status, search, amount, combinados)
- [x] **Búsqueda full-text** via ILIKE en title/description (case-insensitive, sin migración)
- [x] **Exportación a Excel/PDF** de solicitudes
  - Servicio: `app/services/export_service.py` (openpyxl + reportlab)
  - Endpoint: `GET /requests/export?format=excel|pdf`
  - Tests: 3 tests en `test_export.py`

### FASE 7: Reportes & Analytics (MEDIA)
- [ ] **Reporte de presupuesto** por empresa/CC
- [ ] **Dashboard de solicitudes** (pendientes, aprobadas, rechazadas)
- [ ] **Estadísticas** (promedio tiempo aprobación, tasa rechazo)
- [ ] **Reporte de auditoría** (WorkflowLog exportable)
- [ ] **Endpoint analytics**: `GET /analytics/summary`

### FASE 8: Notificaciones (BAJA)
- [ ] **Email notifications** al cambiar estado de solicitud
- [ ] **Notificaciones para aprobadores** (solicitudes pendientes)
- [ ] **Configuración de canales** (email, SMS, webhook)
- [ ] **Email template engine** (Jinja2)

### FASE 9: Validaciones & Business Logic (MEDIA)
- [ ] **Validación: no duplicar solicitudes** en corto tiempo (< 5 min)
- [ ] **Validación: límite máximo de solicitudes** por requester/mes
- [ ] **Validación: campos requeridos** en RequestItem (SKU, cantidad, descripción)
- [ ] **Validación: recepción parcial** no permite recibir más del solicitado
- [ ] **Reglas de negocio**: Requerimiento de cotizaciones para montos > $5,000

### FASE 10: Documentación & DevOps (MEDIA)
- [ ] **OpenAPI/Swagger** completamente documentado
- [ ] **Postman Collection** exportada
- [ ] **Guía de deployment** a producción
- [ ] **Database migration guide** para prod
- [ ] **Backup & restore strategy** para DB
- [ ] **README.md** completo con instrucciones

### FASE 11: Seguridad & Performance (ALTA)
- [ ] **Rate limiting** en endpoints sensibles (login, crear request)
- [ ] **CORS whitelist** configurado por environment
- [ ] **Logging estructurado** (JSON logs con nivel)
- [ ] **Índices en DB** para queries frecuentes
- [ ] **Caché de roles** y matriz de aprobación (Redis opcional)
- [ ] **SQL injection prevention** validado
- [ ] **HTTPS en producción**

### FASE 12: UI Frontend - MVP COMPLETADO ✅
- [x] **Dashboard web** (React 18 + Vite + Tailwind CSS v4 + shadcn/ui)
- [x] **Login page** con React Hook Form + Zod validación
- [x] **Dashboard page** con summary cards, solicitudes recientes, gráfico presupuesto
- [x] **Lista de solicitudes** con filtros (status, búsqueda, monto), paginación, export Excel/PDF
- [x] **Detalle de solicitud** con información, items, timeline de workflow
- [x] **Crear solicitud** con items dinámicos, selección centro de costo, guardar borrador o enviar
- [x] **Acciones de workflow** (enviar, aprobar, rechazar, cancelar, recepción) con diálogos de confirmación
- [x] **Track & Trace visual** con timeline de workflow
- [x] **Layout responsive** con sidebar colapsable, toggle dark/light mode, user dropdown
- [x] **Dockerizado** con multi-stage build (Node 20 + nginx) en puerto 3000
- [x] **Proxy API** nginx redirige `/api/` → backend app:8000
- [ ] **Admin panel** para CRUD (empresas, usuarios, matriz) - pendiente
- [ ] **Notificaciones en tiempo real** (WebSocket) - pendiente

**Stack Frontend:**
| Aspecto | Elección |
|---------|----------|
| Framework | React 18 + Vite 6 + TypeScript |
| Estilos | Tailwind CSS v4 + shadcn/ui (New York) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 (persist) |
| HTTP | Axios (interceptors JWT/401) |
| Forms | React Hook Form + Zod |
| Routing | React Router v6 |
| Icons | Lucide React |
| Toasts | Sonner |
| Docker | Node 20-alpine build + nginx:alpine serve |

**Estructura frontend/**
```
frontend/
├── Dockerfile, nginx.conf, .dockerignore
├── package.json, tsconfig.json, vite.config.ts, components.json
└── src/
    ├── api/ (client, auth, requests, budgets, organizations, types)
    ├── hooks/ (use-auth, use-requests, use-budgets, use-organizations)
    ├── stores/ (auth-store, ui-store)
    ├── lib/ (utils, constants, format)
    ├── components/
    │   ├── ui/ (13 shadcn primitives)
    │   ├── layout/ (sidebar, header, app-layout)
    │   ├── auth/ (protected-route)
    │   ├── dashboard/ (summary-cards, recent-requests, budget-usage-chart)
    │   ├── requests/ (table, filters, status-badge, timeline, actions, form, item-row)
    │   └── shared/ (page-header, loading-skeleton, empty-state, confirm-dialog, pagination)
    └── pages/ (login, dashboard, requests/index, requests/[id], requests/new)
```

---

## COMPLETADA (Histórico)

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

### FASE 4: Tests Automatizados - COMPLETADA
- [x] **Infraestructura de testing**
  - `pytest.ini` creado: `asyncio_mode=auto`, `asyncio_default_fixture_loop_scope=function`
  - `tests/__init__.py` creado
  - `tests/conftest.py` creado: fixtures para DB aislada, seed data, auth helpers
  - Base de datos de test separada (`sgp_db_test`) creada automáticamente con psycopg2
  - Engine disposal entre tests para evitar conexiones stale entre event loops
- [x] **tests/test_auth.py** - 6 tests
  - Login exitoso, contraseña incorrecta, usuario inexistente
  - Endpoint protegido sin token, token inválido
  - Rol admin requerido (403 para requester)
- [x] **tests/test_users.py** - 9 tests
  - GET /me, PUT /me, no puede cambiar rol propio
  - Listar usuarios, obtener por ID
  - Crear usuario (Admin), email duplicado (409)
  - Actualizar usuario (Admin), soft delete (Admin)
- [x] **tests/test_requests.py** - 12 tests
  - Crear borrador, enviar solicitud (reserva presupuesto)
  - No puede enviar dos veces
  - Flujo completo: submit → approve tech → approve fin → receive → complete
  - Rol incorrecto no puede aprobar
  - Rechazar libera presupuesto
  - Cancelar DRAFT, cancelar PENDING, otro usuario no puede cancelar
  - Soft delete solo DRAFT/CANCELLED, no puede eliminar PENDING
  - Timeline con logs de auditoría
- [x] **tests/test_budget.py** - 3 tests
  - Listar presupuestos
  - Submit+complete actualiza ejecutado
  - Reject libera reserva
- [x] **tests/test_organizations.py** - 8 tests
  - Empresas: listar, crear, detalle, actualizar, duplicado
  - Centros de costo: listar, crear, filtrar por empresa
  - Matriz: listar reglas, crear regla, eliminar regla
- [x] **Resultado: 41 tests passed** (ejecutados en Docker)

#### Errores encontrados y solucionados durante testing
1. **SQLite incompatible con UUID/ENUM de PostgreSQL**: Primer intento con `sqlite+aiosqlite:///:memory:` falló (`'str' object has no attribute 'hex'`). Solución: usar PostgreSQL para tests.
2. **Event loop conflicts**: Fixture `event_loop` session-scoped conflictuaba con pytest-asyncio moderno. Error: `InterfaceError: cannot perform operation: another operation is in progress`. Solución: eliminar fixture manual, usar `asyncio_default_fixture_loop_scope=function` en pytest.ini.
3. **Conexiones stale entre tests**: Conexiones del pool persistían entre tests con event loops distintos. Solución: `await engine_test.dispose()` antes y después de cada test.
4. **DB compartida con app en ejecución**: Tests usaban la misma `sgp_db` que uvicorn. Solución: crear DB separada `sgp_db_test` con psycopg2 síncrono al importar conftest.

---

## Archivos Creados
```
CLAUDE.md
PROGRESO.md
.env / .env.example / .gitignore
Dockerfile / alembic.ini / alembic/script.py.mako
app/schemas/workflow.py / budget.py / organization.py / approval_matrix.py
app/schemas/comment.py                     ← NUEVO (Fase 6)
app/schemas/pagination.py                  ← NUEVO (Fase 6)
app/models/comment.py                      ← NUEVO (Fase 6)
app/services/export_service.py             ← NUEVO (Fase 6)
app/api/api_v1/endpoints/budgets.py / organizations.py / approval_matrix.py
.coveragerc                                ← NUEVO (Fase 5)
tests/__init__.py / conftest.py
tests/test_auth.py / test_users.py / test_requests.py / test_budget.py / test_organizations.py
tests/test_security.py                     ← NUEVO (Fase 5)
tests/test_health.py                       ← NUEVO (Fase 5)
tests/test_workflow_service.py             ← NUEVO (Fase 5)
tests/test_budget_service.py               ← NUEVO (Fase 5)
tests/test_performance.py                  ← NUEVO (Fase 5)
tests/test_comments.py                     ← NUEVO (Fase 6)
tests/test_pagination.py                   ← NUEVO (Fase 6)
tests/test_filters.py                      ← NUEVO (Fase 6)
tests/test_export.py                       ← NUEVO (Fase 6)

# Frontend (Fase 12) ──────────────────────
frontend/Dockerfile                        ← multi-stage Node+nginx
frontend/nginx.conf                        ← SPA fallback + /api proxy
frontend/.dockerignore
frontend/package.json / tsconfig.json / vite.config.ts / components.json / index.html
frontend/src/main.tsx / App.tsx / index.css / vite-env.d.ts
frontend/src/api/client.ts / auth.ts / requests.ts / budgets.ts / organizations.ts / types.ts
frontend/src/hooks/use-auth.ts / use-requests.ts / use-budgets.ts / use-organizations.ts
frontend/src/stores/auth-store.ts / ui-store.ts
frontend/src/lib/utils.ts / constants.ts / format.ts
frontend/src/components/ui/ (button, card, input, label, badge, skeleton, separator, avatar, dropdown-menu, dialog, table, textarea, select, tooltip, sheet, tabs)
frontend/src/components/layout/ (sidebar, header, app-layout)
frontend/src/components/auth/protected-route.tsx
frontend/src/components/dashboard/ (summary-cards, recent-requests, budget-usage-chart)
frontend/src/components/requests/ (request-table, request-filters, request-status-badge, request-timeline, request-actions, request-form, request-item-row)
frontend/src/components/shared/ (page-header, loading-skeleton, empty-state, confirm-dialog, pagination-controls)
frontend/src/pages/ (login, dashboard, requests/index, requests/[id], requests/new)
```

## Archivos Modificados
```
requirements.txt                           ← +pytest-cov, openpyxl, reportlab
docker-compose.yml / app/main.py / app/core/config.py / app/core/security.py
app/db/session.py / app/api/deps.py / app/api/api_v1/api.py
app/api/api_v1/endpoints/requests.py       ← Reescrito: paginación, filtros, comments, export
app/api/api_v1/endpoints/users.py          ← +paginación
app/api/api_v1/endpoints/budgets.py        ← +paginación
app/api/api_v1/endpoints/organizations.py  ← +paginación
app/api/api_v1/endpoints/approval_matrix.py ← +paginación
app/schemas/request.py / user.py
app/services/workflow.py
app/models/workflow.py / users.py / request.py / __init__.py
pytest.ini                                 ← +--cov flags
scripts/initial_data.py
```

## Test Users (seed data)
| Email | Password | Rol |
|-------|----------|-----|
| `admin@example.com` | `password` | Admin |
| `requester@example.com` | `password` | Requester |
| `tech@example.com` | `password` | Technical Approver |
| `financial@example.com` | `password` | Financial Approver |
