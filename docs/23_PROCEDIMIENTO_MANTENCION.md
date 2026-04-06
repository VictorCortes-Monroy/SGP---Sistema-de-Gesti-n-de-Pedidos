# Procedimiento: Solicitudes de Mantención (SM)

## Objetivo
Definir el proceso completo para crear, aprobar, ejecutar y cerrar una solicitud de mantención de equipos pesados en el SGP.

---

## Diagrama General del Proceso

```
FASE 1: PLANIFICACIÓN
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ CREAR SM │───>│   ENVIAR A   │───>│  APROBACIÓN  │───>│  COTIZACIÓN  │
│ (DRAFT)  │    │  APROBACIÓN  │    │ JEFE MANT.   │    │  PROVEEDOR   │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                               │
FASE 2: PRERREQUISITOS                                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  GATE DE CONTROL: ¿OC vinculada? ¿Proveedor confirmado?            │
│                   ¿Transporte programado?                            │
│  → Cuando los 3 OK → LISTA PARA EJECUCIÓN                          │
└──────────────────────────────────────────────────────────────────────┘
                                          │
FASE 3: EJECUCIÓN                         ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  EN TRÁNSITO │───>│EN MANTENCIÓN │───>│  RECEPCIÓN   │
│  A TALLER    │    │  (PROVEEDOR) │    │   EQUIPO     │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
FASE 4: CIERRE                                 ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────┐
│ CERTIFICADO  │───>│  EN TRÁNSITO │───>│  CIERRE D5   │───>│FACTURA │──> CERRADA
│  MANTENCIÓN  │    │  A TERRENO   │    │ (OPERATIVO)  │    │ Y PAGO │
└──────────────┘    └──────────────┘    └──────────────┘    └────────┘
```

---

## Tipos de Mantención

| Tipo | Código | Descripción |
|------|--------|-------------|
| **Preventiva** | `PREVENTIVE` | Mantención programada según horómetro o calendario |
| **Correctiva** | `CORRECTIVE` | Reparación de fallas no planificadas |
| **Predictiva** | `PREDICTIVE` | Basada en análisis de condición del equipo |
| **Overhaul** | `OVERHAUL` | Reconstrucción mayor del equipo |

---

## PASO 1: Crear Solicitud de Mantención (SM)

### Responsable
**Planificador Mantención** (`maintenance_planner`) o **Jefe Mantención** (`maintenance_chief`)

### Entrada (Input)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `equipment_id` | UUID | ✅ | Equipo que requiere mantención |
| `maintenance_type` | enum | ✅ | PREVENTIVE, CORRECTIVE, PREDICTIVE, OVERHAUL |
| `description` | string | ✅ | Descripción del trabajo requerido |
| `estimated_cost` | decimal | ❌ | Costo estimado de la mantención |
| `currency` | string | ❌ | Moneda (default: CLP) |
| `planned_date` | datetime | ❌ | Fecha planificada de ejecución |
| `provider_id` | UUID | ❌ | Proveedor asignado (si ya se conoce) |

### Proceso
1. El planificador ejecuta `POST /api/v1/maintenance/requests/`
2. El sistema genera un **código único** formato `SM-YYYY-NNNN` (ej: SM-2024-0001)
3. Se crea la SM en estado **DRAFT**
4. Se valida que el equipo existe y está en estado operativo

### Salida (Output)
```json
{
  "id": "uuid",
  "code": "SM-2024-0015",
  "equipment_id": "uuid",
  "maintenance_type": "CORRECTIVE",
  "status": "DRAFT",
  "description": "Reparación sistema hidráulico excavadora CAT 336",
  "estimated_cost": 3500000.00,
  "currency": "CLP",
  "planned_date": "2024-02-01T08:00:00Z",
  "created_at": "2024-01-20T09:00:00Z"
}
```

---

## PASO 2: Enviar SM a Aprobación

### Responsable
**Planificador Mantención**

### Entrada
| Campo | Tipo | Descripción |
|-------|------|-------------|
| Ninguno | - | Solo el ID de la SM en la URL |

### Proceso
1. Ejecuta `POST /api/v1/maintenance/requests/{id}/submit`
2. Estado cambia a **PENDING_APPROVAL**
3. Se registra en el log de workflow de mantención
4. El Jefe de Mantención recibe la SM para revisión

### Salida
```json
{
  "status": "PENDING_APPROVAL",
  "code": "SM-2024-0015"
}
```

### SLA
- El Jefe de Mantención tiene **16 horas** para responder
- Si excede el tiempo, se genera alerta automática

---

## PASO 3: Aprobación por Jefe de Mantención

### Responsable
**Jefe Mantención** (`maintenance_chief`)

### Entrada
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `comment` | string | ❌ | Observaciones de la aprobación/rechazo |

### Proceso - Aprobar
1. Ejecuta `POST /api/v1/maintenance/requests/{id}/approve`
2. Estado → **APPROVED**
3. El sistema **auto-genera una solicitud de compra** en el módulo SGP:
   - Título: "Mantención: {Nombre Equipo} ({Código SM})"
   - Monto: `estimated_cost` de la SM
   - Centro de costo: El del equipo
   - Estado: DRAFT (inicia su propio flujo de aprobación)
4. La SM queda vinculada al `sgp_request_id`

### Proceso - Rechazar
1. Ejecuta con acción de rechazo
2. Estado → **REJECTED**
3. El planificador puede corregir y reenviar

### Salida (Aprobación)
```json
{
  "status": "APPROVED",
  "sgp_request_id": "uuid-solicitud-compra-auto-generada"
}
```

---

## PASO 4: Cotización del Proveedor

### Responsable
**Planificador Mantención**

### Entrada
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| Cotización D2 | - | ✅ | Monto y detalle de la cotización del proveedor |

### Proceso
1. Se registra la cotización del proveedor (documento D2)
2. Se actualizan datos: `d2_quotation_amount`, `d2_quotation_notes`
3. Estado → **QUOTED_PENDING**

---

## PASO 5: Gate de Control (Prerrequisitos)

### Responsable
**Planificador Mantención** (coordina) + **Compras** (OC)

### Prerrequisitos del Gate

El sistema verifica automáticamente 3 condiciones:

| # | Prerrequisito | Quién lo cumple | Endpoint |
|---|---------------|-----------------|----------|
| 1 | **OC vinculada** | Compras | `POST /maintenance/requests/{id}/link-purchase-order` |
| 2 | **Proveedor confirmado** | Planificador | `POST /maintenance/requests/{id}/confirm-provider` |
| 3 | **Transporte programado** | Planificador | `POST /maintenance/requests/{id}/schedule-transport` |

### Consulta del Estado del Gate
```
GET /api/v1/maintenance/requests/{id}/gate-status
```

### Salida del Gate
```json
{
  "purchase_order_linked": true,
  "provider_confirmed": true,
  "transport_scheduled": true,
  "all_prerequisites_met": true,
  "status": "READY_FOR_EXECUTION"
}
```

### Transición Automática
Cuando los 3 prerrequisitos se cumplen:
- Estado: **AWAITING_PREREQUISITES** → **READY_FOR_EXECUTION**

### SLA
- Confirmación de proveedor: **24 horas** (alerta al planificador)

---

## PASO 6: Ejecución de la Mantención

### Responsable
**Planificador Mantención** (seguimiento) + **Proveedor** (ejecución)

### Flujo de Estados

| Estado | Descripción | Acción |
|--------|-------------|--------|
| **IN_TRANSIT_TO_WORKSHOP** | Equipo en camino al taller | Transporte en curso |
| **IN_MAINTENANCE** | Equipo en taller del proveedor | Proveedor ejecutando trabajos |
| **PENDING_RECEPTION** | Trabajos terminados, esperando recepción | Coordinar retiro/inspección |

### SLA
- Recepción de equipo: **8 horas** tras completar mantención (alerta al Jefe)

---

## PASO 7: Recepción y Certificación

### Responsable
**Jefe Mantención** (recepción) + **Proveedor** (certificado)

### Proceso de Recepción

Se utiliza un **checklist de recepción** con 4 grupos de verificación:

| Grupo | Verificaciones |
|-------|---------------|
| **Alcance** | ¿Se completó todo el trabajo solicitado? |
| **Condición equipo** | ¿El equipo está en buenas condiciones? |
| **Pruebas operacionales** | ¿El equipo funciona correctamente? |
| **Documentación proveedor** | ¿Se entregaron todos los documentos? |

### Certificado de Mantención (D6)
- El proveedor entrega certificado técnico (PDF)
- Se almacena con hash SHA-256 para integridad
- Estado → **PENDING_CERTIFICATE** → tras subir → avanza

### Retorno a Terreno
- Estado → **IN_TRANSIT_TO_FIELD**
- Equipo transportado de vuelta a faena
- Al llegar → **COMPLETED**

---

## PASO 8: Cierre Operativo (D5)

### Responsable
**Jefe Mantención**

### Entrada
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| Firma D5 | - | ✅ | Documento de cierre operativo firmado |

### Proceso
1. El Jefe de Mantención firma el documento D5 de cierre operativo
2. Se registra `d5_signed_at` y `d5_signed_by_id`
3. Estado → **PENDING_D5** → **INVOICING_READY**

---

## PASO 9: Facturación y Pago

### Responsable
**Finanzas** (`finance`)

### Proceso

| Subpaso | Acción | Estado |
|---------|--------|--------|
| 9.1 | Se registra factura del proveedor (`invoice_number`, `invoice_amount`) | INVOICING_READY |
| 9.2 | Finanzas confirma el pago (`payment_confirmed_at`, `payment_confirmed_by_id`) | PENDING_PAYMENT |
| 9.3 | SM se cierra definitivamente | **CLOSED** |

### Salida Final
```json
{
  "status": "CLOSED",
  "code": "SM-2024-0015",
  "actual_cost": 3200000.00,
  "invoice_number": "FAC-2024-00456",
  "invoice_amount": 3200000.00,
  "payment_confirmed_at": "2024-02-15T16:00:00Z",
  "completed_at": "2024-02-10T12:00:00Z"
}
```

---

## Gestión de Equipos

### Registrar Equipo

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `code` | string | ✅ | Código único del equipo (ej: CAT-336-20-4X2A) |
| `name` | string | ✅ | Nombre descriptivo |
| `equipment_type` | enum | ✅ | EXCAVATOR, CRANE, TRUCK, GENERATOR, COMPRESSOR, PUMP, FORKLIFT, OTHER |
| `brand` | string | ✅ | Marca (ej: Caterpillar) |
| `model` | string | ✅ | Modelo (ej: 336) |
| `serial_number` | string | ✅ | Número de serie |
| `model_year` | int | ❌ | Año del modelo |
| `company_id` | UUID | ✅ | Empresa propietaria |
| `cost_center_id` | UUID | ✅ | Centro de costo asignado |
| `current_horometer` | decimal | ❌ | Lectura actual del horómetro |
| `maintenance_interval_hours` | int | ❌ | Intervalo de mantención preventiva (horas) |

### Actualizar Horómetro
```
PUT /api/v1/maintenance/equipment/{id}/horometer
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `reading` | decimal | Nueva lectura del horómetro |
| `notes` | string | Observaciones (opcional) |

Se registra: lectura actual, lectura anterior, delta de horas, quién registró.

### Alerta Automática de Mantención Preventiva
Cuando el equipo tiene **menos del 10%** del intervalo de mantención restante, se genera alerta automática al planificador.

```
Ejemplo:
- Intervalo mantención: 500 horas
- Última mantención: 4,200 horas
- Próxima mantención: 4,700 horas
- Horómetro actual: 4,660 horas (quedan 40h = 8%)
→ ALERTA: Equipo próximo a mantención preventiva
```

---

## Gestión de Proveedores

### Registrar Proveedor

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `code` | string | ✅ | Código del proveedor |
| `name` | string | ✅ | Nombre o razón social |
| `contact_email` | string | ✅ | Email de contacto |
| `phone` | string | ❌ | Teléfono |
| `address` | string | ❌ | Dirección |
| `equipment_types` | array | ❌ | Tipos de equipo que atiende |

---

## Documentos del Flujo (D1-D7) - Resumen

| Doc | Nombre | Responsable | Momento | Descripción |
|-----|--------|-------------|---------|-------------|
| **D1** | Orden de Compra | Sistema (auto) | Al aprobar SM | OC generada automáticamente en módulo SGP |
| **D2** | Cotización | Planificador | Post-aprobación | Cotización formal del proveedor |
| **D3** | Confirmación Proveedor | Planificador | Pre-ejecución | Proveedor confirma disponibilidad y fechas |
| **D4** | Transporte | Planificador | Pre-ejecución | Programación de cama baja / transporte |
| **D5** | Cierre Operativo | Jefe Mantención | Post-mantención | Documento de término firmado |
| **D6** | Certificado | Proveedor | Post-mantención | Certificado técnico de la mantención |
| **D7** | Factura/Pago | Finanzas | Cierre | Factura del proveedor y confirmación de pago |

---

## Resumen del Proceso Completo

| # | Fase | Paso | Responsable | Estado |
|---|------|------|-------------|--------|
| 1 | Planificación | Crear SM | Planificador | DRAFT |
| 2 | Planificación | Enviar a aprobación | Planificador | PENDING_APPROVAL |
| 3 | Planificación | Aprobar SM | Jefe Mantención | APPROVED |
| 4 | Planificación | Cotización proveedor | Planificador | QUOTED_PENDING |
| 5 | Prerrequisitos | Gate: OC + Proveedor + Transporte | Varios | AWAITING → READY |
| 6 | Ejecución | Transporte al taller | Planificador | IN_TRANSIT_TO_WORKSHOP |
| 7 | Ejecución | Mantención en taller | Proveedor | IN_MAINTENANCE |
| 8 | Ejecución | Recepción equipo | Jefe Mantención | PENDING_RECEPTION |
| 9 | Cierre | Certificado mantención | Proveedor | PENDING_CERTIFICATE |
| 10 | Cierre | Retorno a terreno | Planificador | IN_TRANSIT_TO_FIELD → COMPLETED |
| 11 | Cierre | Firma D5 operativo | Jefe Mantención | PENDING_D5 |
| 12 | Cierre | Facturación | Finanzas | INVOICING_READY |
| 13 | Cierre | Confirmación pago | Finanzas | PENDING_PAYMENT → CLOSED |
