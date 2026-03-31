# 15. Módulo de Mantención — Roadmap de Implementación

> **Versión:** 1.0  
> **Fecha:** Febrero 2026  
> **Dependencia:** Todos los documentos `10_` a `14_`  

---

## 1. Estrategia de Implementación

El módulo de mantención se desarrolla como **extensión incremental** del SGP existente. No se modifica código core; se agrega funcionalidad modular.

**Principios:**
- Las migraciones de DB son incrementales (Alembic `--autogenerate`).
- Los endpoints nuevos usan prefijo `/maintenance/`.
- Se reutiliza el sistema de autenticación, RBAC y audit trail existente.
- Se agrega frontend como nuevas páginas dentro del SPA actual.

---

## 2. Fases de Implementación

### Fase M0: Infraestructura Base (1 semana)

**Objetivo:** Preparar la base para el módulo sin afectar el SGP en producción.

| Tarea | Detalle | Archivos |
|-------|---------|----------|
| Modelos SQLAlchemy | Crear modelos para las 7 tablas nuevas | `app/models/maintenance/` |
| Migración Alembic | Generar migración incremental | `alembic/versions/xxx_add_maintenance.py` |
| Schemas Pydantic | DTOs de entrada/salida | `app/schemas/maintenance/` |
| Roles en seed data | Agregar `Maintenance Planner` y `Maintenance Chief` | `scripts/initial_data.py` |
| Router base | Registrar `/maintenance/` en API | `app/api/api_v1/api.py` |
| Tests estructura | Verificar que las tablas se crean correctamente | `tests/test_maintenance_models.py` |

**Criterio de aceptación:** `alembic upgrade head` crea las tablas sin error. Seed data incluye los 2 roles nuevos.

### Fase M1: Equipos + Proveedores + SM Básica (2 semanas)

**Objetivo:** CRUD de equipos y proveedores. Crear y enviar SM.

| Tarea | Endpoints | Tests |
|-------|-----------|-------|
| CRUD Equipos | `GET/POST/PUT /equipment/`, `PUT /{id}/horometer` | CRUD + actualización horómetro + alertas |
| CRUD Proveedores | `GET/POST/PUT /maintenance/providers/` | CRUD + filtros por tipo |
| Crear SM | `POST /maintenance/requests/` | Crear borrador, validar campos obligatorios |
| Enviar SM | `POST /maintenance/requests/{id}/submit` | Submit → PENDING_APPROVAL |
| Aprobar/Rechazar SM | `POST /{id}/approve`, `POST /{id}/reject` | Aprobación con flujo, rechazo con comentario |
| Listar SM | `GET /maintenance/requests/` | Filtros, paginación |
| Detalle SM | `GET /maintenance/requests/{id}` | Con timeline |

**Criterio de aceptación:** Un planificador puede crear una SM, enviarla, y el Jefe de Mantenimiento puede aprobarla o rechazarla con audit trail completo.

### Fase M2: Flujos Paralelos + Gate de Control (2 semanas)

**Objetivo:** Implementar la bifurcación paralela y el gate de control — la pieza clave del diseño.

| Tarea | Detalle | Tests |
|-------|---------|-------|
| Auto-creación de solicitud de compra | Al aprobar SM → crear `Request` en SGP | E2E: SM aprobada → Request creada con datos correctos |
| Confirmación de proveedor | `POST /{id}/confirm-provider` | Confirmar → actualizar flag → verificar gate |
| Programación cama baja | `POST /maintenance/transport/` + calendario | Programar, detectar conflictos |
| Hook OC → SM | Cuando SGP genera OC → actualizar SM | OC generada → purchase_order_code actualizado |
| Gate de control | Verificación automática de 3 condiciones | Gate OK (3/3), Gate bloqueado (falta 1), Gate bloqueado (faltan 2) |
| Auto-transición | `AWAITING_PREREQUISITES → READY_FOR_EXECUTION` | Se dispara al completar última condición |

**Criterio de aceptación:** Al aprobar SM, se crea solicitud de compra automáticamente. El gate bloquea la ejecución hasta que las 3 condiciones estén cumplidas. Cuando se cumple la última, la SM transiciona automáticamente.

### Fase M3: Ejecución + Recepción Conforme (2 semanas)

**Objetivo:** Flujo de ejecución completo con recepción conforme obligatoria.

| Tarea | Detalle | Tests |
|-------|---------|-------|
| Inicio de ejecución | `POST /{id}/start-execution` con validación de gate | No avanza sin gate OK |
| Cambio de status equipo | Automático según transiciones SM | Status equipo sincronizado |
| Fin de ejecución | `POST /{id}/complete-execution` | Proveedor notifica fin |
| Recepción conforme | `POST /{id}/reception` con checklist completo | APPROVED → PENDING_CERTIFICATE, REJECTED → IN_MAINTENANCE |
| Checklist persistido | JSONB en `maint_reception_checklists` | Checklist auditable, verificar estructura |
| Ciclo de subsanación | Rechazo → vuelta a mantención → nueva recepción | Múltiples intentos de recepción |

**Criterio de aceptación:** El flujo completo desde ejecución hasta recepción conforme funciona. El checklist se almacena y es consultable. La recepción es obligatoria — no se puede avanzar sin ella.

### Fase M4: Certificado + Cierre + Métricas (2 semanas)

**Objetivo:** Cierre formal del ciclo con certificado, retorno de equipo y métricas.

| Tarea | Detalle | Tests |
|-------|---------|-------|
| Upload certificado | `POST /{id}/upload-certificate` (PDF) | File upload, hash verification |
| Retorno de equipo | `POST /{id}/return-equipment` | Status equipo → OPERATIVE |
| Cierre formal | `POST /{id}/close` | Ciclo completo cerrado, expediente |
| Actualización equipo | Auto: `next_maintenance_due`, `last_maintenance_date` | Cálculo correcto de próximo umbral |
| Analytics endpoint | `GET /maintenance/analytics/summary` | Métricas calculadas correctamente |
| Timeline completo | `GET /{id}/timeline` | Todos los eventos registrados |
| Export | `GET /maintenance/requests/export?format=excel` | Excel con datos correctos |

**Criterio de aceptación:** E2E completo desde SM-DRAFT hasta COMPLETED con certificado, equipo operativo y métricas generadas.

### Fase M5: Frontend (3 semanas)

**Objetivo:** Interfaces web para todos los actores del módulo.

| Página | Actor Principal | Componentes |
|--------|----------------|-------------|
| `/maintenance/equipment` | Planificador | Listado de equipos, estado, horómetros, alertas de umbral |
| `/maintenance/requests` | Todos | Listado de SM con filtros, paginación, export |
| `/maintenance/requests/new` | Planificador | Formulario de creación de SM |
| `/maintenance/requests/{id}` | Todos | Detalle con timeline, acciones contextuales por rol |
| `/maintenance/reception/{id}` | Jefe Mant. | Formulario de checklist de recepción conforme |
| `/maintenance/transport` | Jefe Mant. | Calendario de cama baja (vista semanal) |
| `/maintenance/dashboard` | Gerencia | KPIs, cumplimiento de plan, costos, tiempos |

**Stack:** Misma stack del SGP frontend (React 18 + Vite + Tailwind + shadcn/ui + TanStack Query).

### Fase M6: SLA Engine + Notificaciones (1 semana)

| Tarea | Detalle |
|-------|---------|
| Background job SLA checker | Cron/celery que evalúa SLAs cada hora |
| Alertas de horómetro | Notificar cuando equipo está a X% del umbral |
| Alertas de SLA | Warning y escalamiento automático |
| Email templates | Templates para cada tipo de notificación |

---

## 3. Timeline Estimado

```
Semana  1: ████ Fase M0 — Infraestructura Base
Semana  2: ████████ Fase M1 — Equipos + Proveedores + SM
Semana  3: ████████ Fase M1 (cont.)
Semana  4: ████████ Fase M2 — Flujos Paralelos + Gate
Semana  5: ████████ Fase M2 (cont.)
Semana  6: ████████ Fase M3 — Ejecución + Recepción
Semana  7: ████████ Fase M3 (cont.)
Semana  8: ████████ Fase M4 — Certificado + Cierre
Semana  9: ████████ Fase M4 (cont.)
Semana 10: ████████ Fase M5 — Frontend
Semana 11: ████████ Fase M5 (cont.)
Semana 12: ████████ Fase M5 (cont.)
Semana 13: ████ Fase M6 — SLA + Notificaciones
```

**Total estimado: ~13 semanas (3 meses)**

---

## 4. Estructura de Archivos Nuevos

```
app/
├── models/
│   └── maintenance/
│       ├── __init__.py
│       ├── equipment.py          # MaintEquipment, MaintHorometerLog
│       ├── provider.py           # MaintProvider, MaintProviderEquipmentType
│       ├── request.py            # MaintRequest
│       ├── reception.py          # MaintReceptionChecklist
│       ├── certificate.py        # MaintCertificate
│       └── transport.py          # MaintTransportSchedule
├── schemas/
│   └── maintenance/
│       ├── __init__.py
│       ├── equipment.py
│       ├── provider.py
│       ├── request.py
│       ├── reception.py
│       ├── certificate.py
│       ├── transport.py
│       └── analytics.py
├── services/
│   └── maintenance/
│       ├── __init__.py
│       ├── maintenance_workflow.py   # Motor de workflow de mantención
│       ├── gate_control.py           # Verificación de prerrequisitos
│       ├── equipment_service.py      # Lógica de equipos y horómetros
│       ├── purchase_integration.py   # Vinculación SM ↔ SGP requests
│       └── sla_engine.py             # Motor de SLAs
├── api/
│   └── api_v1/
│       └── endpoints/
│           └── maintenance/
│               ├── __init__.py
│               ├── equipment.py
│               ├── providers.py
│               ├── requests.py
│               ├── reception.py
│               ├── transport.py
│               └── analytics.py

frontend/src/
├── api/
│   └── maintenance.ts               # API client para módulo mantención
├── hooks/
│   └── use-maintenance.ts            # React Query hooks
├── pages/
│   └── maintenance/
│       ├── equipment.tsx
│       ├── requests/
│       │   ├── index.tsx
│       │   ├── new.tsx
│       │   └── [id].tsx
│       ├── reception/[id].tsx
│       ├── transport.tsx
│       └── dashboard.tsx
├── components/
│   └── maintenance/
│       ├── equipment-table.tsx
│       ├── sm-form.tsx
│       ├── sm-timeline.tsx
│       ├── gate-status.tsx
│       ├── reception-checklist.tsx
│       ├── transport-calendar.tsx
│       └── maintenance-dashboard.tsx

tests/
├── test_maintenance_equipment.py
├── test_maintenance_providers.py
├── test_maintenance_requests.py
├── test_maintenance_workflow.py
├── test_maintenance_gate.py
├── test_maintenance_reception.py
├── test_maintenance_integration.py   # E2E: SM → OC → Ejecución → Cierre
└── test_maintenance_analytics.py
```

---

## 5. Dependencias con SGP Existente

| Componente SGP | Uso en Módulo Mantención | Modificación Requerida |
|---------------|-------------------------|----------------------|
| `users` tabla | FK para created_by, approved_by, etc. | Ninguna |
| `roles` tabla | 2 roles nuevos agregados | INSERT solamente |
| `companies` tabla | FK en equipos | Ninguna |
| `cost_centers` tabla | FK en equipos, presupuesto | Ninguna |
| `requests` tabla | SM genera solicitud de compra | Agregar `source_type` y `source_reference_id` (opcionales) |
| `workflow_logs` tabla | Audit trail de acciones | Agregar `maint_request_id` (FK nullable) |
| `budgets` tabla | Reserva de presupuesto al aprobar SM | Ninguna (se usa el flujo existente vía la Request generada) |
| Auth/JWT | Autenticación de endpoints | Ninguna |
| RBAC (`require_role`) | Protección de endpoints por rol | Agregar roles nuevos a la función |

**Impacto en SGP existente: MÍNIMO.** Solo 2 columnas opcionales nuevas en tablas existentes.

---

## 6. Test E2E — Flujo Completo

```python
async def test_maintenance_full_cycle():
    """
    Valida el flujo completo desde creación de SM hasta cierre.
    Este test es el criterio de aceptación final del módulo.
    """
    # 1. Planificador crea SM
    sm = await create_maintenance_request(equipment_id, provider_id, ...)
    assert sm.status == "DRAFT"
    
    # 2. Planificador envía SM
    sm = await submit_maintenance_request(sm.id)
    assert sm.status == "PENDING_APPROVAL"
    
    # 3. Jefe Mant. aprueba → dispara flujos paralelos
    sm = await approve_maintenance_request(sm.id)
    assert sm.status == "AWAITING_PREREQUISITES"
    assert sm.purchase_request_id is not None  # Solicitud de compra creada
    
    # 4. Verificar gate bloqueado (0/3)
    gate = await check_gate(sm.id)
    assert gate["gate_approved"] == False
    assert len(gate["missing"]) == 3
    
    # 5. Proveedor confirma
    await confirm_provider(sm.id)
    
    # 6. Abastecimiento genera OC (vía SGP)
    await generate_purchase_order(sm.purchase_request_id, "OC-2026-0001")
    
    # 7. Programar cama baja
    await schedule_transport(sm.id, outbound_date="2026-03-15")
    
    # 8. Gate debería estar OK (3/3)
    sm = await get_maintenance_request(sm.id)
    assert sm.status == "READY_FOR_EXECUTION"
    
    # 9. Iniciar ejecución
    await start_execution(sm.id)
    assert equipment.status == "IN_MAINTENANCE"
    
    # 10. Completar ejecución
    await complete_execution(sm.id)
    assert sm.status == "PENDING_RECEPTION"
    
    # 11. Recepción conforme
    await submit_reception(sm.id, status="APPROVED", checklist={...})
    assert sm.status == "PENDING_CERTIFICATE"
    
    # 12. Cargar certificado
    await upload_certificate(sm.id, file=cert_pdf)
    
    # 13. Retorno de equipo
    await return_equipment(sm.id)
    
    # 14. Cierre
    sm = await close_maintenance_request(sm.id)
    assert sm.status == "COMPLETED"
    assert equipment.status == "OPERATIVE"
    assert equipment.last_certificate_id is not None
    
    # 15. Verificar timeline completo
    timeline = await get_timeline(sm.id)
    assert len(timeline) >= 12  # Todas las acciones registradas
```
