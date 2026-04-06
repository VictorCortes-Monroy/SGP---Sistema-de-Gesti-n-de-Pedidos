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

### FASE 7: Reportes, Dashboard Mejorado & Auditoría - COMPLETADA ✅
- [x] **Reporte de presupuesto** por empresa/CC con filtros (año, empresa)
  - Backend: `GET /budgets/report`, `GET /budgets/report/export?format=excel|pdf`
  - Schemas: `BudgetReportItem`, `CompanyBudgetGroup`, `BudgetReportResponse`
  - Frontend: página `/presupuestos` con cards resumen, tablas por empresa, barras de utilización %
  - Exportación Excel/PDF funcional
- [x] **Dashboard mejorado** con endpoint consolidado
  - Backend: `GET /dashboard/summary` - 1 query retorna todo (status_distribution, pending_actions, budget_summary, recent_requests)
  - Pending actions según rol: Admin→PENDING_*, Tech→PENDING_TECHNICAL, Fin→PENDING_FINANCIAL, Requester→DRAFT/REJECTED propios
  - Frontend: pills de distribución por estado (clickeables), card acciones pendientes con links, budget chart con % y warning >80%
- [x] **Reporte de auditoría** exportable (solo Admin)
  - Backend: `GET /audit/logs`, `GET /audit/logs/export?format=excel|pdf`
  - Filtros: date_from, date_to, action, actor_id, request_id
  - Frontend: página `/admin/auditoria` con tabla, filtros, paginación, export Excel/PDF
  - Sidebar actualizado con link "Auditoría" en sección admin

---

## MÓDULO DE MANTENCIÓN PREVENTIVA (docs 10–15)

> **Contexto:** Los documentos 10–15 especifican un nuevo módulo integrado que conecta el ciclo de mantención de equipos con el ciclo de compras del SGP. Principio rector: *"el flujo documental va ADELANTE o EN PARALELO al flujo físico, nunca detrás."*
>
> **Integración clave (RF-M07):** SM aprobada → crea automáticamente `Request` en SGP → OC generada → actualiza SM. Extensión limpia: 8 tablas `maint_*`, 2 nuevos roles, endpoints `/maintenance/` y `/equipment/`, sin modificar código core.
>
> **Timeline estimado:** ~13 semanas (3 meses) en 7 fases (M0–M6).

### FASE M0: Infraestructura Base (1 semana) — COMPLETADA ✅
- [x] **8 modelos SQLAlchemy** con prefijo `maint_`:
  - `maint_equipment` + `maint_horometer_logs` (`app/models/maintenance/equipment.py`)
  - `maint_providers` + `maint_provider_equipment_types` (`app/models/maintenance/provider.py`)
  - `maint_requests` con enum `MaintRequestStatus` (13 estados) (`app/models/maintenance/request.py`)
  - `maint_reception_checklists` (`app/models/maintenance/checklist.py`)
  - `maint_certificates` (`app/models/maintenance/certificate.py`)
  - `maint_transport_schedule` (`app/models/maintenance/transport.py`)
- [x] **Migración Alembic incremental** con secuencia `maint_request_seq` y función `generate_sm_code()` (formato SM-YYYY-NNNN)
- [x] **Schemas Pydantic base** (`app/schemas/maintenance/`)
- [x] **Roles nuevos** en `scripts/initial_data.py`: `maintenance_planner`, `maintenance_chief`
- [x] **Router skeleton** registrado en `app/api/api_v1/api.py`
- [x] **Tests estructura**: tablas creadas, roles existentes

### FASE M1: CRUD Equipos + Proveedores + SM Básica (2 semanas) — COMPLETADA ✅
- [x] **CRUD Equipos** (`GET/POST/PUT/DELETE /equipment/`, `PUT /equipment/{id}/horometer`) — con recálculo automático de `next_maintenance_due`
- [x] **CRUD Proveedores** (`GET/POST/PUT /maintenance/providers/`)
- [x] **SM básica** (`app/api/api_v1/endpoints/maintenance/requests.py`):
  - `POST /maintenance/requests/` — crear SM con código correlativo
  - `GET /maintenance/requests/` — listar con filtros (status, equipment_id, planned_date)
  - `GET /maintenance/requests/{id}` — detalle
  - `POST /maintenance/requests/{id}/submit` — DRAFT → PENDING_APPROVAL
  - `POST /maintenance/requests/{id}/approve` — PENDING_APPROVAL → APPROVED + AWAITING_PREREQUISITES
  - `POST /maintenance/requests/{id}/reject` — PENDING_APPROVAL → REJECTED
- [x] **Servicio SM** (`app/services/maintenance/sm_service.py`) — lógica de transiciones
- [x] **Tests M1**: 8 equipos + 5 proveedores + 8 SM básica

### FASE M2: Flujos Paralelos + Gate de Control (2 semanas) — COMPLETADA ✅
- [x] **Auto-creación de Solicitud de Compra en SGP** al aprobar SM (`create_purchase_request_from_sm()` vía `WorkflowEngine` existente)
- [x] **Confirmación de proveedor** (`POST /maintenance/requests/{id}/confirm-provider`)
- [x] **Programación cama baja** (`POST /maintenance/requests/{id}/schedule-transport`) + detección de conflictos (`GET /maintenance/transport/conflicts`)
- [x] **Hook OC→SM** (`POST /maintenance/requests/{id}/link-purchase-order`) — actualiza `purchase_order_code` en SM
- [x] **Gate de control** (`check_gate_prerequisites()`) — verifica 3 condiciones: OC vinculada, proveedor confirmado, transporte programado
- [x] **Auto-transición** AWAITING_PREREQUISITES → READY_FOR_EXECUTION cuando se cumple la última condición
- [x] **Endpoint gate status** (`GET /maintenance/requests/{id}/gate-status`) — pills de estado por condición
- [x] **Tests M2**: 10 gate + 5 integración SM↔SGP

### FASE M3: Ejecución + Recepción Conforme (2 semanas) — COMPLETADA ✅
- [x] **Inicio ejecución** (`POST .../start-execution`) — READY_FOR_EXECUTION → IN_TRANSIT_TO_WORKSHOP, equipo status=IN_TRANSIT
- [x] **Llegada al taller** (`POST .../confirm-workshop-arrival`) — → IN_MAINTENANCE, equipo status=IN_MAINTENANCE
- [x] **Fin ejecución** (`POST .../complete-execution`) — IN_MAINTENANCE → PENDING_RECEPTION
- [x] **Recepción conforme** (`POST .../reception`) con checklist JSONB en 4 grupos:
  - scope_verification, equipment_condition, operational_tests, provider_documentation
  - Resultado OK → PENDING_CERTIFICATE
  - Resultado RECHAZADO → IN_MAINTENANCE (con `remediation_deadline`)
- [x] **Schemas checklist** (`app/schemas/maintenance/checklist.py`) — `ChecklistInput`, `ChecklistResponse`
- [x] **Tests M3**: Ejecución completa y endpoints de recepción, pruebas de check OK e iteración de rechazos

### FASE M4: Certificado + Cierre + Analytics (2 semanas) — COMPLETADA ✅
- [x] **Upload certificado PDF** (`POST .../upload-certificate`) — SHA-256 hash, crea `MaintCertificate`, → IN_TRANSIT_TO_FIELD
- [x] **Retorno equipo** (`POST .../confirm-field-return`) — → COMPLETED, actualiza equipo: `status=OPERATIVE`, `last_maintenance_date`, `last_certificate_id`, `next_maintenance_due += interval`
- [x] **Cierre formal** (`POST .../close`) — con factura (`invoice_number`, `invoice_amount`)
- [x] **Timeline completo** (`GET /maintenance/requests/{id}/timeline`) — 16 acciones en workflow_logs
- [x] **Export Excel** (`GET /maintenance/requests/export`) — reutiliza `export_service.py`
- [x] **Analytics** (`GET /maintenance/analytics/summary`) — KPIs: equipos próximos a umbral, SMs por estado, tasa recepción conforme, próximas fechas
- [x] **Tests M4**: 6 certificado + 4 analytics

### FASE M5: Frontend (3 semanas) — COMPLETADA ✅
- [x] **Types + API clients + hooks** — `MaintenanceAnalyticsSummary`, `EquipmentDueAlert`, `getAnalyticsSummary()`, `useMaintAnalytics()`
- [x] **5 páginas nuevas:**
  - `/mantencion` — Dashboard mantención: KPIs (PM/CM/En Ejecución/Pend.Recepción), tiempo ciclo, alertas equipos próximos a umbral
  - `/equipos` — Lista equipos con filtros + modal horómetro (existía parcialmente, corregida)
  - `/mantencion/solicitudes` — Lista SMs con filtros status/búsqueda, paginación, export Excel
  - `/mantencion/solicitudes/nueva` — Formulario crear SM (equipo, tipo, descripción, fecha, proveedor opcional, costo)
  - `/mantencion/solicitudes/:id` — Detalle SM: gate status (3 pills), timeline, acciones por rol
- [x] **5 componentes nuevos:**
  - `sm-status-badge.tsx` — Badge para 13 estados con colores
  - `gate-status-card.tsx` — Card con 3 pills (OC, Proveedor, Transporte)
  - `sm-timeline.tsx` — Timeline de workflow_logs con ACTION_LABELS
  - `sm-request-table.tsx` — Tabla SMs con código correlativo y estados
  - `sm-actions.tsx` — Todos los botones + diálogos del ciclo de vida completo (submit, approve, reject, confirm-provider, schedule-transport, link-PO, start-execution, arrive, complete, reception checklist, upload cert, field-return, close)
- [x] **Sidebar** — Sección "Mantención" con Dashboard, Equipos, Solicitudes SM (visible para `maintenance_*` y Admin)
- [x] **Routing** en `App.tsx` — 5 nuevas rutas bajo `/mantencion/` y `/equipos`
- [x] **Build Docker** exitoso — sin errores TypeScript

---

## ALINEACIÓN AL FLUJO COMERCIAL COMPLETO (SGP_MAINT_DEV_SPEC.md)

> **Estrategia:** Extensión sin ruptura sobre M0–M5. Se agregan 5 estados + flujo documental al final del ciclo de vida existente.

### ETAPA 1: Roles + Sidebar — COMPLETADA ✅
- [x] Roles `purchasing` (Abastecimiento) y `finance` (Finanzas) en `scripts/initial_data.py`
- [x] Usuarios seed: `purchasing@example.com`, `finance@example.com` (password: `password`)
- [x] Sidebar admin: Usuarios, Empresas, Centros de Costo, Matriz Aprobación, Auditoría

### ETAPA 2: Nuevos Estados + Migración + Campos Modelo — COMPLETADA ✅
- [x] `MaintRequestStatus` extendido con 5 nuevos estados: `QUOTED_PENDING`, `PENDING_D5`, `INVOICING_READY`, `PENDING_PAYMENT`, `CLOSED`
- [x] Campos D2 en `maint_requests`: `d2_quotation_amount`, `d2_quotation_notes`, `d2_registered_at`
- [x] Campos D5 en `maint_requests`: `d5_signed_at`, `d5_signed_by_id`
- [x] Campos pago en `maint_requests`: `payment_confirmed_at`, `payment_confirmed_by_id`
- [x] Migración Alembic: `a1b2c3d4e5f6_extend_maint_flow.py`

### ETAPA 3: Nuevos Endpoints de Transición — COMPLETADA ✅
- [x] `approve_sm()`: ahora transiciona a `QUOTED_PENDING` (antes: directo a `AWAITING_PREREQUISITES`)
- [x] `confirm_field_return()`: ahora transiciona a `PENDING_D5` (antes: `COMPLETED`)
- [x] `POST /maintenance/requests/{id}/register-quotation` — QUOTED_PENDING → AWAITING_PREREQUISITES, guarda D2 (rol: purchasing/Admin)
- [x] `POST /maintenance/requests/{id}/sign-d5` — PENDING_D5 → INVOICING_READY, guarda D5 (rol: maintenance_chief/Admin)
- [x] `POST /maintenance/requests/{id}/register-invoice` — INVOICING_READY → PENDING_PAYMENT, validación RN8 de 5 documentos (rol: purchasing/Admin)
- [x] `POST /maintenance/requests/{id}/confirm-payment` — PENDING_PAYMENT → CLOSED, actualiza equipo OPERATIVE (rol: finance/Admin)
- [x] RN8: `register_invoice` valida presencia de D1(OC), D2, D3(proveedor), D4(transporte), D5 — error 422 con detalle si falta alguno

### ETAPA 4: Tabla maint_documents + Upload/Download — COMPLETADA ✅
- [x] Modelo `MaintDocument` (`app/models/maintenance/document.py`) — tipos D1–D7, archivo, mime, uploaded_by
- [x] Relación `documents` en `MaintRequest`
- [x] Migración Alembic: `b1c2d3e4f5a6_add_maint_documents.py`
- [x] `POST /maintenance/requests/{id}/documents` — upload multipart/form-data (max 10MB, PDF/PNG/JPG/XLSX)
- [x] `GET /maintenance/requests/{id}/documents` — lista documentos de la SM
- [x] `GET /maintenance/documents/{doc_id}/download` — descarga con Content-Disposition

### ETAPA 5: Frontend — COMPLETADA ✅
- [x] `MaintRequestStatus` extendido con 5 nuevos estados en `types.ts`
- [x] Campos D2/D5/payment añadidos a `MaintRequestResponse` en `types.ts`
- [x] `sm-status-badge.tsx`: 5 nuevos estados con colores (QUOTED_PENDING=amarillo, PENDING_D5=naranja, INVOICING_READY=teal, PENDING_PAYMENT=azul, CLOSED=verde)
- [x] `sm-actions.tsx`: 4 nuevas acciones (Registrar Cotización D2, Firmar D5, Registrar Factura, Confirmar Pago) con dialogs + validación de roles
- [x] Guard de roles extendido: ahora incluye `purchasing` y `finance` en `ALL_MAINT_ROLES`
- [x] 4 nuevas funciones API en `maintenance.ts`: `registerQuotation`, `signD5`, `registerInvoice`, `confirmPayment`
- [x] 4 nuevos mutation hooks en `use-maintenance.ts`: `useRegisterQuotation`, `useSignD5`, `useRegisterInvoice`, `useConfirmPayment`
- [x] Componente `document-list.tsx` — lista D1–D7 con badges, upload con clasificador de tipo, download
- [x] Página detalle SM (`[id].tsx`): card "Flujo Comercial" (D2/D5/factura/pago) + `DocumentList`
- [x] Schemas Pydantic `MaintRequestResponse` extendido con campos D2/D5/payment

### ETAPA 6: Tests + Documentación — COMPLETADA ✅
- [x] `tests/test_maintenance_commercial_flow.py` — 11 tests: flujo E2E completo cotización→D5→factura→pago
- [x] Test RN8: factura falla sin D5 (estado incorrecto → 400) y sin OC (gate no pasa)
- [x] Test documentos D1-D7: upload, list, download, tipo inválido (422)
- [x] Test timeline: D2_QUOTATION_REGISTERED, D5_SIGNED, INVOICE_REGISTERED, PAYMENT_CONFIRMED
- [x] Tests M1-M4 actualizados y pasando (7/7) — sin regresiones
- [x] Bug fix: `download_router` separado para `/documents/{id}/download` (prefijo correcto)
- **Resultado**: 18 tests totales, todos PASSED (11 flujo comercial + 7 M1-M4)

### MEJORAS MÓDULO SOLICITUDES DE PEDIDO — COMPLETADO ✅

#### Backend
- [x] **Presupuesto no bloqueante**: `reserve_funds()` ya no lanza error si no hay presupuesto o si se excede el monto. Sigue registrando la reserva para referencia.
- [x] **Campo `purchase_type`** en modelo `Request`: `INSUMOS` / `ACTIVOS_FIJOS` / `OTROS_SERVICIOS` (string, default `INSUMOS`)
- [x] **Modelo `RequestDocument`** (`app/models/request_document.py`) — mismo patrón que `MaintDocument`
- [x] **Migración** `c1d2e3f4a5b6_add_purchase_type_and_request_docs.py` (down_revision: `b1c2d3e4f5a6`)
- [x] **3 endpoints de documentos** en `requests.py`:
  - `POST /requests/{id}/documents` — upload multipart (max 10MB, PDF/Word/Excel)
  - `GET /requests/{id}/documents` — lista documentos con uploader
  - `GET /requests/documents/{doc_id}/download` — FileResponse con Content-Disposition
- [x] **`download_router`** separado, montado en `/requests/documents` prefix (misma arquitectura que mantención)
- [x] **Schema `RequestDocumentResponse`** + `documents: List[...]` en `RequestDetail`

#### Frontend
- [x] **Formulario nueva solicitud** (`request-form.tsx`) reestructurado en 4 secciones:
  1. **Organización**: selector Empresa → CC filtrado por empresa (reset CC al cambiar empresa)
  2. **Detalle**: título + tipo de compra con descripción + descripción
  3. **Ítems**: sin cambios
  4. **Documentos Adjuntos**: input file + lista con nombre/tamaño/botón eliminar, subida post-creación
- [x] **Detalle solicitud** (`[id].tsx`): badge `purchase_type` en header, card "Documentos Adjuntos" con descarga e ícono por tipo (PDF/Excel/Word), botón upload para DRAFT del requester
- [x] **Sidebar**: "Solicitudes" → "Solicitudes de Pedido", "Solicitudes SM" → "Solicitudes de Mantención"
- [x] **`types.ts`**: `PurchaseType`, `RequestDocument`, `purchase_type` en `RequestCreate/Response/Detail`
- [x] **`requests.ts`**: `getDocuments`, `uploadDocument`, `getDocumentDownloadUrl`
- [x] **`use-requests.ts`**: `useRequestDocuments`, `useUploadRequestDocument`

#### Equipment Code Auto-generation
- [x] **Código de equipo auto-generado** en formato `{MARCA3}-{MODELO4}-{AÑO2}-{VIN4}` (ej: `CAT-336D-20-4X2A`)
- [x] **Función `_generate_equipment_code()`** en `equipment.py` con cleanup regex
- [x] **Colisiones resueltas** con sufijo `_2`, `_3`, etc.
- [x] **Frontend** (`/equipos/nuevo`): campo código eliminado, banner informativo del formato

### MÓDULO ADMIN PANEL + EQUIPMENT FLOW — COMPLETADO ✅

#### Admin Panel CRUD
- [x] **Usuarios** (`/admin/usuarios`) — tabla paginada, crear/editar/desactivar, selector de rol
- [x] **Empresas** (`/admin/empresas`) — CRUD completo, validación RUT/tax_id único
- [x] **Centros de Costo** (`/admin/centros-costo`) — CRUD con filtro por empresa
- [x] **Matriz de Aprobación** (`/admin/matriz-aprobacion`) — reglas por empresa/CC/rol/monto, filtros
- [x] **Backend completo**: `users.py`, `organizations.py`, `approval_matrix.py` con todos los endpoints CRUD
- [x] **Frontend**: 4 páginas + `admin.ts` + `use-admin.ts` + sidebar admin con 5 links (Admin only)

#### Equipment Flow (Crear y Registrar Equipos)
- [x] **Seed data**: 10 equipos realistas en `scripts/seed_equipment.py` (idempotente) + `initial_data.py`
- [x] **`/equipos/nuevo`** — formulario crear equipo (código, tipo, ficha técnica, empresa/CC, horómetro, PM interval)
- [x] **`/equipos/:id`** — detalle con edición inline, historial horómetro, SMs recientes, acciones (actualizar horómetro, nueva SM)
- [x] **Backend**: `GET /{id}/horometer-history` en equipment.py
- [x] **Tipos y hooks**: `HorometerLogEntry`, `useHorometerHistory`, `useUpdateEquipment`

### FASE M6: SLA Engine + Notificaciones (1 semana) — COMPLETADA ✅
- [x] **Background job** (APScheduler) — verifica SLAs cada hora
- [x] **4 condiciones de incumplimiento** monitoreadas con deduplicación
- [x] **Endpoint manual** `POST /maintenance/alerts/run-checks` (Admin)
- [x] **Alertas** `GET /maintenance/alerts/`, `GET /maintenance/alerts/count`, `PATCH /maintenance/alerts/{id}/read`
- [x] `app/services/maintenance/sla_service.py`
- [x] `app/api/api_v1/endpoints/maintenance/alerts.py`
- [x] Migración: `d1e2f3a4b5c6_add_maint_alerts.py`

---

### FASE 8: Notificaciones SGP (BAJA) — DIFERIDA
- [ ] **Email notifications
** al cambiar estado de solicitud de compra
- [ ] **Notificaciones para aprobadores** (solicitudes pendientes)
- [ ] **Email template engine** (Jinja2) — compartido con M6

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
- [x] **Admin panel** CRUD completo — Usuarios, Empresas, Centros de Costo, Matriz de Aprobación

---

## PRUEBAS DE INTEGRACIÓN E2E CON ENDPOINTS (2026-04-05)

> **Contexto:** Pruebas manuales ejecutadas contra los contenedores Docker levantados localmente.
> Puertos: API=8000, Frontend=3002, PostgreSQL=5433 (remapeados por conflicto con otros servicios).

### Infraestructura Docker
- [x] `docker-compose up --build` exitoso — 3 servicios: db (PostgreSQL 15), app (FastAPI), frontend (React/Nginx)
- [x] Migraciones Alembic aplicadas automáticamente (7 versiones)
- [x] Seed data cargado exitosamente (8 usuarios con roles)
- [x] **Nota:** Puertos 5432 y 3000/3001 estaban ocupados por contenedores workshop/supabase → remapeados a 5433 y 3002 en `docker-compose.yml`

### 1. Autenticación (5/5 OK)
- [x] Login exitoso para los 8 roles: admin, requester, tech, financial, planner, chief, purchasing, finance
- [x] JWT token generado correctamente (bearer)
- [x] Login con credenciales inválidas retorna HTTP 400 (correcto)
- [x] Token permite acceso a endpoints protegidos
- [x] `/health` retorna `{"status": "healthy"}`

### 2. Usuarios y Roles (3/3 OK)
- [x] `GET /users/` — Retorna 8 usuarios seed
- [x] `GET /users/me` — Retorna usuario autenticado con email y role
- [x] `GET /users/roles` — Lista 8 roles: Admin, Requester, Technical Approver, Financial Approver, maintenance_planner, maintenance_chief, purchasing, finance

### 3. Organizaciones — CRUD Completo (4/4 OK)
- [x] `POST /organizations/companies` — Empresa "T-METAL SPA" creada (tax_id: 76.123.456-7)
- [x] `GET /organizations/companies` — Lista empresas correctamente
- [x] `POST /organizations/cost-centers` — Centro de costo "Operaciones Mineras" (CC-001) creado bajo T-METAL SPA
- [x] `GET /organizations/cost-centers` — Lista centros de costo

### 4. Matriz de Aprobación (2/2 OK)
- [x] Regla 1 creada: Technical Approver, step_order=1, min_amount=0 → toda solicitud requiere aprobación técnica
- [x] Regla 2 creada: Financial Approver, step_order=2, min_amount=1000 → montos ≥$1,000 requieren aprobación financiera

### 5. Flujo E2E Solicitud de Pedido — COMPLETO (10/10 OK)

**Solicitud**: "Repuestos Excavadora CAT 336D" — 3 items, total $5,090.00
- Filtro de aceite: 5x $350.00 = $1,750.00
- Filtro hidráulico: 3x $520.00 = $1,560.00
- Kit de sellos: 2x $890.00 = $1,780.00

| Paso | Acción | Actor | Transición | Estado |
|------|--------|-------|-----------|--------|
| 1 | Crear solicitud | requester@example.com | → DRAFT | OK |
| 2 | Enviar a aprobación | requester@example.com | DRAFT → PENDING_TECHNICAL | OK |
| 3 | Aprobación técnica | tech@example.com | PENDING_TECHNICAL → PENDING_FINANCIAL | OK |
| 4 | Aprobación financiera | financial@example.com | PENDING_FINANCIAL → APPROVED | OK |
| 5 | Recepción total | requester@example.com | APPROVED → COMPLETED | OK |
| 6 | Timeline (4 eventos) | requester@example.com | — | OK |
| 7 | Agregar comentario | requester@example.com | — | OK (campo: `text`) |
| 8 | Listar comentarios | requester@example.com | — | OK (1 comentario) |
| 9 | Export Excel | admin@example.com | — | OK (5,144 bytes) |
| 10 | Dashboard summary | admin@example.com | — | OK (2 requests, status_distribution, budget_summary) |

**Timeline verificado:**
```
1. [SUBMITTED] DRAFT → PENDING_TECHNICAL (John Requester, IP: 172.21.0.1)
2. [APPROVE] PENDING_TECHNICAL → PENDING_FINANCIAL (Jane Tech) — "Specs OK, aprobado"
3. [APPROVE] PENDING_FINANCIAL → APPROVED (Scrooge McDuck) — "Presupuesto OK"
4. [RECEIVED_FULL] APPROVED → COMPLETED (John Requester) — "Todo recibido en bodega"
```

### 6. Equipos — CRUD + Horómetro (4/4 OK)
- [x] Seed data: 10 equipos precargados (CAT, Komatsu, JCB, Atlas Copco, Liebherr, Volvo, Mercedes-Benz)
- [x] `POST /maintenance/equipment/` — Equipo creado: código auto-generado `CAT-336D-00-0011`, tipo EXCAVATOR, horómetro 4500h
- [x] `PUT /maintenance/equipment/{id}/horometer` — Actualizado a 4780h (campo: `reading`)
- [x] `GET /maintenance/equipment/{id}/horometer-history` — 1 registro en historial

### 7. Proveedores (1/1 OK)
- [x] `POST /maintenance/providers/` — "Finning Chile" creado (campo: `rut`, no `tax_id`)

### 8. Flujo E2E Solicitud de Mantención SM-2026-0001 — COMPLETO (18/18 eventos OK)

**SM**: Mantención preventiva para Motoniveladora CAT 14M (horómetro 12,300h)

| Paso | Acción | Actor (Rol) | Transición | Estado |
|------|--------|------------|-----------|--------|
| 1 | Crear SM | planner (maintenance_planner) | → DRAFT | OK |
| 2 | Submit | planner | DRAFT → PENDING_APPROVAL | OK |
| 3 | Approve | chief (maintenance_chief) | PENDING_APPROVAL → APPROVED | OK |
| 4 | Auto-transition | sistema | APPROVED → QUOTED_PENDING | OK (automático) |
| 5 | Confirm provider | planner | gate 1/3 ✅ | OK |
| 6 | Schedule transport | planner | gate 2/3 ✅ (campo: `scheduled_date`) | OK |
| 7 | Register quotation D2 | purchasing | QUOTED_PENDING → AWAITING_PREREQUISITES | OK (campo: `quotation_amount`) |
| 8 | Link purchase order | planner | gate 3/3 ✅ (campo: `purchase_order_code`) | OK |
| 9 | Gate auto-pass | sistema | AWAITING_PREREQUISITES → READY_FOR_EXECUTION | OK (automático) |
| 10 | Start execution | chief | READY_FOR_EXECUTION → IN_TRANSIT_TO_WORKSHOP | OK |
| 11 | Workshop arrival | chief | IN_TRANSIT_TO_WORKSHOP → IN_MAINTENANCE | OK |
| 12 | Complete execution | chief | IN_MAINTENANCE → PENDING_RECEPTION | OK |
| 13 | Reception (checklist) | chief | PENDING_RECEPTION → PENDING_CERTIFICATE | OK (4 grupos checklist) |
| 14 | Upload certificate | chief | PENDING_CERTIFICATE → IN_TRANSIT_TO_FIELD | OK (PDF upload) |
| 15 | Confirm field return | chief | IN_TRANSIT_TO_FIELD → PENDING_D5 | OK |
| 16 | Sign D5 | chief | PENDING_D5 → INVOICING_READY | OK |
| 17 | Register invoice | purchasing | INVOICING_READY → PENDING_PAYMENT | OK |
| 18 | Confirm payment | finance | PENDING_PAYMENT → CLOSED | OK |

**Gate Control verificado:**
```json
{
  "purchase_order": true,
  "provider_confirmed": true,
  "transport_scheduled": true,
  "is_ready_for_execution": true
}
```

**Timeline completo (18 eventos):**
```
 1. [CREATED] None → DRAFT
 2. [SUBMITTED] DRAFT → PENDING_APPROVAL
 3. [APPROVED] PENDING_APPROVAL → APPROVED
 4. [AUTO_TRANSITION] APPROVED → QUOTED_PENDING
 5. [PROVIDER_CONFIRMED] QUOTED_PENDING → QUOTED_PENDING
 6. [TRANSPORT_SCHEDULED] QUOTED_PENDING → QUOTED_PENDING
 7. [D2_QUOTATION_REGISTERED] QUOTED_PENDING → AWAITING_PREREQUISITES
 8. [PO_LINKED] AWAITING_PREREQUISITES → AWAITING_PREREQUISITES
 9. [GATE_PASSED] AWAITING_PREREQUISITES → READY_FOR_EXECUTION
10. [EXECUTION_STARTED] READY_FOR_EXECUTION → IN_TRANSIT_TO_WORKSHOP
11. [WORKSHOP_ARRIVAL_CONFIRMED] IN_TRANSIT_TO_WORKSHOP → IN_MAINTENANCE
12. [EXECUTION_COMPLETED] IN_MAINTENANCE → PENDING_RECEPTION
13. [RECEPTION_APPROVED] PENDING_RECEPTION → PENDING_CERTIFICATE
14. [CERTIFICATE_UPLOADED] PENDING_CERTIFICATE → IN_TRANSIT_TO_FIELD
15. [EQUIPMENT_RETURNED] IN_TRANSIT_TO_FIELD → PENDING_D5
16. [D5_SIGNED] PENDING_D5 → INVOICING_READY
17. [INVOICE_REGISTERED] INVOICING_READY → PENDING_PAYMENT
18. [PAYMENT_CONFIRMED] PENDING_PAYMENT → CLOSED
```

### 9. Endpoints Auxiliares (5/5 OK)
- [x] `GET /maintenance/analytics/summary` — KPIs: 1 preventive, 0 corrective, cycle time, upcoming maintenance
- [x] `GET /maintenance/alerts/count` — 0 alertas (recién iniciado)
- [x] `GET /audit/logs` — 4 logs de workflow registrados con acciones
- [x] `GET /budgets/` — 1 presupuesto seed (IT Operations, $10,000)
- [x] `GET /budgets/report` — Reporte por año con grand totals

### 10. Validaciones de Seguridad Verificadas
- [x] **RBAC funcional**: `register-quotation` requiere rol `purchasing/Admin` — planner recibe 403
- [x] **RBAC funcional**: `start-execution` requiere `maintenance_chief/Admin` — planner recibe 403
- [x] **RBAC funcional**: `link-purchase-order` requiere `maintenance_planner/chief/Requester` — purchasing recibe 403
- [x] **Estado inválido**: `complete-execution` en estado != IN_MAINTENANCE retorna error descriptivo
- [x] **Estado inválido**: `close` en estado != COMPLETED retorna "Only COMPLETED requests can be formally closed"
- [x] **Login inválido**: Credenciales incorrectas retornan HTTP 400

### Notas de Campos Observados
> Durante las pruebas se identificaron los nombres exactos de campos requeridos por los schemas:

| Endpoint | Campo esperado | Campo incorrecto (usado inicialmente) |
|----------|---------------|--------------------------------------|
| `PUT /equipment/{id}/horometer` | `reading` | `value` |
| `POST /maintenance/requests/{id}/register-quotation` | `quotation_amount` | `quoted_amount` |
| `POST /maintenance/requests/{id}/link-purchase-order` | `purchase_order_code` | `purchase_order_number` |
| `POST /maintenance/requests/{id}/schedule-transport` | `scheduled_date` | `departure_date` |
| `POST /organizations/companies` | — | `company_id` no existe en RequestCreate |
| `POST /maintenance/equipment/` | `equipment_type`: enum EXCAVATOR/CRANE/TRUCK/etc | valor en español rechazado |
| `POST /maintenance/providers/` | `rut` | `tax_id` |
| `POST /requests/{id}/comments` | `text` | `content` |
| `POST /requests/{id}/receive` | `is_partial` + `comment` | `received_all` |
| Approval Matrix | `role_id` + `step_order` | `approver_id` + `step` |

### Documentación Notion
- [x] **Página creada**: [SGP — Sistema de Gestión y Trazabilidad de Pedidos](https://www.notion.so/33a3758bd88a81b3ba3ff3657455fcbf)
- Contenido: Tech stack, arquitectura, 6 módulos, máquinas de estado (8+13 estados), matriz aprobación, control presupuestario, 7 migraciones, 8 roles, usuarios prueba, instrucciones ejecución, 19 archivos de test (94% cov), estado de implementación completo
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
frontend/src/components/dashboard/ (summary-cards, recent-requests, budget-usage-chart, status-distribution, pending-actions)
frontend/src/components/requests/ (request-table, request-filters, request-status-badge, request-timeline, request-actions, request-form, request-item-row)
frontend/src/components/shared/ (page-header, loading-skeleton, empty-state, confirm-dialog, pagination-controls)
frontend/src/pages/ (login, dashboard, requests/index, requests/[id], requests/new, budgets, admin/audit)
frontend/src/api/ (+dashboard.ts, +audit.ts)
frontend/src/hooks/ (+use-dashboard.ts, +use-audit.ts)

# Backend FASE 7 ──────────────────────
app/schemas/dashboard.py                    ← NUEVO (dashboard consolidado)
app/api/api_v1/endpoints/dashboard.py       ← NUEVO (GET /dashboard/summary)
app/api/api_v1/endpoints/audit.py           ← NUEVO (GET /audit/logs, GET /audit/logs/export)
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
