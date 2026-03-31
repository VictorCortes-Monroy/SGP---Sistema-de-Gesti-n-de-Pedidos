# 12. Módulo de Mantención — Requerimientos Funcionales

> **Versión:** 1.0  
> **Fecha:** Febrero 2026  
> **Autor:** Área de Excelencia Operacional e Innovación  
> **Dependencia:** `10_MAINT_DIAGNOSTICO_CAUSA_RAIZ.md`, `11_MAINT_PROCESO_TOBE.md`  

---

## 1. Visión del Módulo

Extender el SGP actual con un módulo de **Gestión de Mantención Preventiva** que integre el ciclo de mantención con el ciclo de compras, eliminando la desconexión entre el flujo operacional y el flujo administrativo. El módulo debe tratar cada mantención como un evento con dimensión técnica Y financiera desde su origen.

---

## 2. Nuevos Roles

El módulo introduce 2 roles nuevos al sistema RBAC existente. Se integran con la tabla `roles` actual del SGP.

| Rol | Código en DB | Permisos Clave |
|-----|-------------|----------------|
| **Planificador de Mantención** | `maintenance_planner` | Crear SM, ver plan de mantención, gestionar horómetros, ver historial de mantenciones por equipo. |
| **Jefe de Mantenimiento** | `maintenance_chief` | Aprobar SM, enviar requerimiento a proveedor, programar cama baja, ejecutar recepción conforme, firmar cierre técnico. |

Los roles existentes (`requester`, `technical_approver`, `financial_approver`, `purchasing`, `admin`) mantienen sus permisos actuales e interactúan con el módulo de mantención cuando la SM genera una solicitud de compra.

---

## 3. Requerimientos Funcionales

### RF-M01: Gestión de Equipos

El sistema debe permitir registrar y mantener un catálogo de equipos sujetos a mantención preventiva.

**Campos del equipo:**
- `id` (UUID, PK)
- `code` — Código interno del equipo (único)
- `name` — Nombre descriptivo
- `type` — Tipo de equipo (ej: excavadora, camión, generador)
- `company_id` — Empresa propietaria (FK → companies)
- `cost_center_id` — Centro de costo asignado (FK → cost_centers)
- `current_horometer` — Lectura actual de horómetro (horas)
- `maintenance_interval_hours` — Intervalo de mantención preventiva (horas)
- `next_maintenance_due` — Horómetro esperado para próxima mantención
- `status` — ENUM: `OPERATIVE`, `IN_MAINTENANCE`, `IN_TRANSIT`, `OUT_OF_SERVICE`
- `last_maintenance_date` — Fecha de última mantención completada
- `last_certificate_id` — Referencia al último certificado vigente
- `created_at`, `updated_at`

**Endpoints:**
- `GET /equipment/` — Listar equipos (filtros: status, type, company, cost_center)
- `GET /equipment/{id}` — Detalle de equipo con historial de mantenciones
- `POST /equipment/` — Crear equipo (Admin, Planificador)
- `PUT /equipment/{id}` — Actualizar equipo
- `PUT /equipment/{id}/horometer` — Actualizar horómetro (genera alerta si alcanza umbral)
- `GET /equipment/{id}/maintenance-history` — Historial de mantenciones del equipo

### RF-M02: Catálogo de Proveedores de Mantención

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID, PK | Identificador único |
| `name` | string | Razón social del proveedor |
| `tax_id` | string | RUT / Tax ID |
| `contact_name` | string | Nombre de contacto principal |
| `contact_email` | string | Email de contacto |
| `contact_phone` | string | Teléfono |
| `service_types` | array[string] | Tipos de servicio que ofrece |
| `equipment_types` | array[string] | Tipos de equipo que atiende |
| `workshop_location` | string | Ubicación del taller |
| `is_active` | boolean | Si está activo para nuevas SM |

**Endpoints:**
- `GET /maintenance/providers/` — Listar proveedores (filtros: equipment_type, service_type)
- `POST /maintenance/providers/` — Crear proveedor (Admin)
- `PUT /maintenance/providers/{id}` — Actualizar proveedor

### RF-M03: Solicitud de Mantención (SM)

Entidad central del módulo. Representa el ciclo de vida completo de una mantención preventiva.

**Campos de la SM:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID, PK | Identificador único |
| `code` | string | Número correlativo: `SM-YYYY-NNNN` |
| `equipment_id` | UUID, FK | Equipo a mantener |
| `provider_id` | UUID, FK | Proveedor asignado |
| `maintenance_type` | ENUM | `PREVENTIVE`, `CORRECTIVE` (futuro) |
| `description` | text | Descripción del alcance |
| `estimated_cost` | decimal | Costo estimado |
| `planned_date` | date | Fecha planificada de ejecución |
| `horometer_at_request` | integer | Horómetro al momento de crear SM |
| `status` | ENUM | Ver máquina de estados abajo |
| `created_by` | UUID, FK | Planificador que creó |
| `approved_by` | UUID, FK | Jefe de Mant. que aprobó |
| `purchase_request_id` | UUID, FK, nullable | Solicitud de compra vinculada (generada automáticamente) |
| `purchase_order_code` | string, nullable | Código de OC vinculada |
| `provider_confirmed` | boolean | ¿Proveedor confirmó disponibilidad? |
| `provider_confirmed_date` | date, nullable | Fecha de confirmación del proveedor |
| `transport_scheduled` | boolean | ¿Cama baja programada? |
| `transport_scheduled_date` | date, nullable | Fecha programada de traslado |
| `actual_start_date` | datetime, nullable | Fecha/hora real de inicio de mantención |
| `actual_end_date` | datetime, nullable | Fecha/hora real de fin de mantención |
| `reception_status` | ENUM, nullable | `APPROVED`, `REJECTED`, `PENDING` |
| `reception_date` | datetime, nullable | Fecha de recepción conforme |
| `reception_by` | UUID, FK, nullable | Quien firmó recepción |
| `reception_notes` | text, nullable | Observaciones de recepción |
| `certificate_uploaded` | boolean | ¿Certificado cargado? |
| `certificate_file_id` | UUID, FK, nullable | Referencia al archivo de certificado |
| `certificate_date` | date, nullable | Fecha del certificado |
| `equipment_returned_date` | datetime, nullable | Fecha de retorno a faena |
| `invoice_number` | string, nullable | N° factura del proveedor |
| `invoice_amount` | decimal, nullable | Monto facturado |
| `closed_at` | datetime, nullable | Fecha de cierre formal |
| `created_at`, `updated_at` | datetime | Timestamps automáticos |

**Endpoints:**
- `POST /maintenance/requests/` — Crear SM (Planificador)
- `GET /maintenance/requests/` — Listar SM (filtros: status, equipment, provider, date_range)
- `GET /maintenance/requests/{id}` — Detalle de SM con timeline completo
- `POST /maintenance/requests/{id}/approve` — Aprobar SM (Jefe Mant.) → dispara flujos paralelos
- `POST /maintenance/requests/{id}/reject` — Rechazar SM (Jefe Mant.)
- `POST /maintenance/requests/{id}/confirm-provider` — Registrar confirmación de proveedor
- `POST /maintenance/requests/{id}/schedule-transport` — Programar cama baja
- `POST /maintenance/requests/{id}/start-execution` — Registrar inicio de mantención
- `POST /maintenance/requests/{id}/complete-execution` — Registrar fin de mantención
- `POST /maintenance/requests/{id}/reception` — Registrar recepción conforme/no conforme (con checklist)
- `POST /maintenance/requests/{id}/upload-certificate` — Cargar certificado de mantención
- `POST /maintenance/requests/{id}/return-equipment` — Registrar retorno de equipo a faena
- `POST /maintenance/requests/{id}/close` — Cierre formal del ciclo
- `GET /maintenance/requests/{id}/timeline` — Track & trace completo
- `GET /maintenance/requests/export` — Exportar a Excel/PDF

### RF-M04: Gate de Control Pre-Ejecución

El sistema debe verificar automáticamente 3 condiciones antes de permitir el avance a ejecución:

| Condición | Verificación | Bloqueo si falla |
|-----------|-------------|------------------|
| OC generada y confirmada | `purchase_order_code IS NOT NULL` AND proveedor confirmó recepción de OC | No se puede registrar `start-execution` |
| Proveedor confirmó | `provider_confirmed == true` | No se puede registrar `start-execution` |
| Cama baja programada | `transport_scheduled == true` | No se puede registrar `start-execution` |

El endpoint `POST /maintenance/requests/{id}/start-execution` debe validar estas 3 condiciones y retornar error con detalle de cuáles faltan si no se cumplen.

### RF-M05: Recepción Conforme

La recepción conforme es un paso obligatorio post-mantención.

**Input del endpoint `POST /maintenance/requests/{id}/reception`:**

```json
{
  "status": "APPROVED" | "REJECTED",
  "checklist": {
    "scope_verification": {
      "all_work_completed": true | false | null,
      "components_replaced": true | false | null,
      "functional_tests_done": true | false | null,
      "correct_parts_used": true | false | null
    },
    "equipment_condition": {
      "hydraulic_systems": true | false | null,
      "electrical_systems": true | false | null,
      "safety_systems": true | false | null,
      "fluid_levels": true | false | null,
      "structure_condition": true | false | null
    },
    "operational_tests": {
      "startup_shutdown": true | false | null,
      "idle_operation": true | false | null,
      "load_operation": true | false | null,
      "instruments_gauges": true | false | null
    },
    "provider_documentation": {
      "technical_report": true | false | null,
      "parts_list": true | false | null,
      "observations_reported": true | false | null,
      "photo_evidence": true | false | null
    }
  },
  "notes": "Observaciones generales...",
  "rejection_details": "Solo si status = REJECTED: detalle de observaciones",
  "remediation_deadline": "2026-03-15"  // Solo si REJECTED
}
```

**Reglas de negocio:**
- Si `APPROVED` → SM avanza a estado `PENDING_CERTIFICATE`.
- Si `REJECTED` → SM vuelve a `IN_MAINTENANCE`. Se notifica al proveedor con las observaciones.
- El checklist completo se almacena como JSON y es auditable.
- La recepción debe ser firmada por un usuario con rol `maintenance_chief`.

### RF-M06: Programación de Cama Baja

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID, PK | Identificador |
| `maintenance_request_id` | UUID, FK | SM vinculada |
| `trip_type` | ENUM | `OUTBOUND` (faena→taller), `RETURN` (taller→faena) |
| `scheduled_date` | date | Fecha programada |
| `actual_date` | datetime, nullable | Fecha/hora real |
| `status` | ENUM | `SCHEDULED`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED` |
| `notes` | text, nullable | Observaciones |

**Endpoints:**
- `GET /maintenance/transport/schedule` — Ver calendario de cama baja (vista semanal/mensual)
- `POST /maintenance/transport/` — Programar viaje
- `PUT /maintenance/transport/{id}` — Actualizar viaje
- `GET /maintenance/transport/conflicts` — Detectar conflictos de programación

**Regla de negocio:** Si 2+ viajes se solapan en la misma fecha, el sistema genera alerta de conflicto. El Jefe de Mantenimiento debe resolver manualmente priorizando por criticidad.

### RF-M07: Vinculación SM → Solicitud de Compra (SGP existente)

Al aprobar una SM, el sistema debe **automáticamente**:

1. Crear una nueva solicitud de compra (`requests`) en el SGP existente con:
   - `title`: "Mantención preventiva — {equipo.name} — {SM.code}"
   - `requester_id`: ID del Jefe de Mantenimiento que aprobó
   - `cost_center_id`: Centro de costo del equipo
   - `total_amount`: Costo estimado de la SM
   - `status`: `DRAFT` → inmediatamente submit → `PENDING_TECHNICAL` (o según matriz)
   - Items: 1 item con descripción del servicio de mantención
2. Vincular la solicitud creada a la SM (`purchase_request_id`).
3. Cuando abastecimiento genera la OC en el flujo estándar del SGP, actualizar `purchase_order_code` en la SM.

Esta vinculación es la **pieza clave** que conecta el flujo de mantención con el flujo de compras (intervención para RC1).

### RF-M08: Dashboard de Mantención

Vistas específicas para el módulo:

- **Vista Planificador:** Equipos con horómetro próximo a umbral, SM en borrador, cumplimiento del plan mensual.
- **Vista Jefe de Mantenimiento:** SM pendientes de aprobación, SM en ejecución, recepciones pendientes, calendario de cama baja.
- **Vista Abastecimiento:** Solicitudes de compra originadas por mantención con flag `MAINTENANCE`, OC pendientes de generar.
- **Vista Gerencia:** KPIs de mantención, tiempo promedio fuera de faena, % cumplimiento de plan, costos acumulados.

### RF-M09: Reportes y Métricas

| Métrica | Cálculo |
|---------|---------|
| Tiempo promedio de ciclo completo | `closed_at - created_at` por SM completada |
| Tiempo promedio fuera de faena | `equipment_returned_date - transport_outbound_actual_date` |
| Tiempo promedio por etapa | Diferencia entre timestamps de cada transición de estado |
| % cumplimiento de plan | SM completadas en fecha planificada / total SM del período |
| Tasa de recepción no conforme | SM con `reception_status = REJECTED` / total recepciones |
| SLA compliance por etapa | % de etapas completadas dentro del SLA definido |
| Costo real vs. estimado | `invoice_amount / estimated_cost` por SM |
| Utilización de cama baja | Horas en uso / horas disponibles por período |

**Endpoint:** `GET /maintenance/analytics/summary?period=monthly&date=2026-02`

### RF-M10: Alertas y Notificaciones del Módulo

| Evento | Destinatario | Canal |
|--------|-------------|-------|
| Equipo próximo a umbral de horómetro | Planificador | Email + Dashboard |
| SM pendiente de aprobación | Jefe de Mantenimiento | Email + Dashboard |
| SM aprobada → solicitud de compra creada | Abastecimiento | Email + Dashboard |
| OC pendiente de generación > 2 días | Jefe de Abastecimiento | Email |
| Gate de control: condición faltante | Responsable del paso pendiente | Email + Dashboard |
| Proveedor notifica fin de mantención | Jefe de Mantenimiento | Email + Dashboard |
| Recepción conforme pendiente > 1 día | Jefe de Mantenimiento | Email |
| Certificado no cargado > 2 días post-RC | Proveedor (vía Jefe Mant.) | Email |
| Conflicto de cama baja detectado | Jefe de Mantenimiento | Dashboard |

---

## 4. Requerimientos No Funcionales del Módulo

| Categoría | Requerimiento |
|-----------|---------------|
| **Integración** | El módulo debe integrarse con el SGP existente sin modificar el flujo actual de solicitudes de compra. La vinculación SM → Solicitud de Compra es por referencia (FK). |
| **Rendimiento** | El gate de control debe verificar las 3 condiciones en < 500ms. |
| **Concurrencia** | Soportar actualización simultánea de horómetros de múltiples equipos. |
| **Archivos** | Certificados de mantención en formato PDF, máximo 10MB por archivo. |
| **Auditoría** | Todas las acciones del módulo se registran en la misma tabla `workflow_logs` del SGP, con `entity_type = 'maintenance_request'`. |
| **Migraciones** | El módulo se agrega mediante migraciones Alembic incrementales. No modifica tablas existentes excepto agregar FKs opcionales. |
