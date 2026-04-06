# Procedimiento: Solicitudes de Pedido (Compra)

## Objetivo
Definir el proceso completo para crear, aprobar, gestionar y completar una solicitud de pedido en el SGP.

---

## Diagrama General del Proceso

```
┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  CREAR   │───>│   ENVIAR A   │───>│  APROBACIÓN  │───>│  APROBACIÓN  │
│ SOLICITUD│    │  APROBACIÓN  │    │   TÉCNICA    │    │  FINANCIERA  │
│ (DRAFT)  │    │  (SUBMIT)    │    │  (PASO 1)    │    │  (PASO 2*)   │
└──────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                          │                     │
                                          ▼                     ▼
                                    ┌──────────┐         ┌──────────┐
                                    │ RECHAZAR │         │ APROBADA │
                                    └──────────┘         └──────────┘
                                                               │
                                          ┌────────────────────┘
                                          ▼
                                    ┌──────────────┐    ┌──────────────┐
                                    │   EN COMPRA  │───>│  RECEPCIÓN   │───> COMPLETADA
                                    │ (PURCHASING) │    │   DE BIENES  │
                                    └──────────────┘    └──────────────┘

* Paso 2 solo aplica si monto > $1,000
```

---

## PASO 1: Crear Solicitud

### Responsable
**Solicitante** (rol `Requester`)

### Entrada (Input)

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `title` | string | ✅ | Título descriptivo de la solicitud |
| `description` | string | ❌ | Descripción detallada de la necesidad |
| `cost_center_id` | UUID | ✅ | Centro de costo que financia la compra |
| `purchase_type` | enum | ❌ | `INSUMOS` (default), `ACTIVOS_FIJOS`, `OTROS_SERVICIOS` |
| `items` | array | ✅ | Lista de ítems a comprar (mínimo 1) |

**Cada ítem requiere:**

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `description` | string | ✅ | Descripción del producto/servicio |
| `sku` | string | ❌ | Código SKU o referencia del producto |
| `quantity` | decimal | ✅ | Cantidad solicitada |
| `unit_price` | decimal | ✅ | Precio unitario estimado |

### Proceso
1. El solicitante envía `POST /api/v1/requests/` con los datos
2. El sistema calcula `total_price` por ítem (`quantity × unit_price`)
3. El sistema calcula `total_amount` de la solicitud (suma de todos los ítems)
4. Se crea la solicitud en estado **DRAFT**

### Salida (Output)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Compra de insumos de oficina",
  "description": "Resmas de papel y tóner para impresoras",
  "requester_id": "uuid-del-solicitante",
  "cost_center_id": "uuid-centro-costo",
  "status": "DRAFT",
  "total_amount": 2500.00,
  "currency": "USD",
  "current_step": 0,
  "purchase_type": "INSUMOS",
  "items": [
    {
      "id": "uuid",
      "description": "Resma papel A4",
      "sku": "PAP-001",
      "quantity": 50,
      "unit_price": 5.00,
      "total_price": 250.00
    },
    {
      "id": "uuid",
      "description": "Tóner HP LaserJet",
      "sku": "TON-HP-42A",
      "quantity": 10,
      "unit_price": 225.00,
      "total_price": 2250.00
    }
  ],
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Acciones adicionales en DRAFT
- **Adjuntar documentos**: `POST /api/v1/requests/{id}/documents` (PDF, Word, Excel, imágenes; máx 10MB)
- **Agregar comentarios**: `POST /api/v1/requests/{id}/comments`
- **Eliminar solicitud**: `DELETE /api/v1/requests/{id}` (soft delete)

---

## PASO 2: Enviar a Aprobación (Submit)

### Responsable
**Solicitante** (el creador de la solicitud)

### Entrada
| Campo | Tipo | Descripción |
|-------|------|-------------|
| Ninguno | - | Solo se requiere el ID de la solicitud en la URL |

### Prerrequisitos
- La solicitud debe estar en estado **DRAFT**
- Solo el creador original puede enviarla

### Proceso
1. El solicitante ejecuta `POST /api/v1/requests/{id}/submit`
2. El sistema **reserva presupuesto** en el centro de costo (referencial)
3. El sistema consulta la **Matriz de Aprobación** para determinar la cadena:
   - Busca reglas que coincidan con: empresa + centro de costo + monto
   - Ordena por `step_order` ascendente
4. Se crea registro en **WorkflowLog** (acción: SUBMITTED)
5. El estado cambia según la primera aprobación requerida

### Lógica de Determinación de Aprobadores

```
SI monto >= $0 (siempre):
   → Paso 1: Aprobador Técnico → estado PENDING_TECHNICAL

SI monto > $1,000:
   → Paso 2: Aprobador Financiero → estado PENDING_FINANCIAL (después del paso 1)

SI no hay reglas de aprobación configuradas:
   → La solicitud pasa directamente a APPROVED
```

### Salida
```json
{
  "id": "uuid",
  "status": "PENDING_TECHNICAL",
  "current_step": 1,
  "total_amount": 2500.00,
  "logs": [
    {
      "action": "SUBMITTED",
      "from_status": "DRAFT",
      "to_status": "PENDING_TECHNICAL",
      "actor_name": "Solicitante",
      "timestamp": "2024-01-15T10:35:00Z"
    }
  ]
}
```

### Efecto en Presupuesto
| Campo | Antes | Después |
|-------|-------|---------|
| `reserved_amount` | $0.00 | +$2,500.00 |
| `available_amount` | $10,000.00 | $7,500.00 |

---

## PASO 3: Aprobación Técnica

### Responsable
**Aprobador Técnico** (rol `Technical Approver`)

### Entrada
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `comment` | string | ❌ | Observaciones técnicas |

### Prerrequisitos
- La solicitud debe estar en estado **PENDING_TECHNICAL**
- El usuario debe tener rol `Technical Approver`

### Proceso - Aprobar
1. El aprobador revisa la solicitud, ítems y documentos adjuntos
2. Ejecuta `POST /api/v1/requests/{id}/approve` con comentario opcional
3. El sistema verifica el rol del usuario
4. Se registra la aprobación en **WorkflowLog** con IP del aprobador
5. Se incrementa `current_step`
6. Se determina el siguiente estado:
   - Si hay más pasos → **PENDING_FINANCIAL**
   - Si no hay más pasos → **APPROVED**

### Proceso - Rechazar
1. El aprobador ejecuta `POST /api/v1/requests/{id}/reject`
2. El sistema **libera la reserva de presupuesto**
3. Estado cambia a **REJECTED**
4. Se registra el rechazo con comentario en **WorkflowLog**

### Salida (Aprobación)
```json
{
  "id": "uuid",
  "status": "PENDING_FINANCIAL",
  "current_step": 2,
  "logs": [
    {
      "action": "APPROVED",
      "from_status": "PENDING_TECHNICAL",
      "to_status": "PENDING_FINANCIAL",
      "actor_name": "Aprobador Técnico",
      "actor_role": "Technical Approver",
      "comment": "Especificaciones técnicas correctas",
      "ip_address": "192.168.1.100",
      "timestamp": "2024-01-15T14:20:00Z"
    }
  ]
}
```

### Salida (Rechazo)
```json
{
  "status": "REJECTED",
  "logs": [
    {
      "action": "REJECTED",
      "from_status": "PENDING_TECHNICAL",
      "to_status": "REJECTED",
      "comment": "SKU incorrecto en ítem 2, verificar con proveedor"
    }
  ]
}
```

---

## PASO 4: Aprobación Financiera

### Responsable
**Aprobador Financiero** (rol `Financial Approver`)

> **Nota**: Este paso solo aplica si el monto total > $1,000

### Entrada
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `comment` | string | ❌ | Observaciones financieras |

### Prerrequisitos
- La solicitud debe estar en estado **PENDING_FINANCIAL**
- El usuario debe tener rol `Financial Approver`

### Proceso - Aprobar
1. El aprobador revisa monto, presupuesto disponible y justificación
2. Ejecuta `POST /api/v1/requests/{id}/approve`
3. Como es el último paso, el estado cambia a **APPROVED**
4. Se registra en **WorkflowLog**

### Proceso - Rechazar
Idéntico al rechazo técnico: libera presupuesto, estado → REJECTED.

### Salida (Aprobación)
```json
{
  "status": "APPROVED",
  "current_step": 2,
  "logs": [
    {
      "action": "APPROVED",
      "from_status": "PENDING_FINANCIAL",
      "to_status": "APPROVED",
      "actor_role": "Financial Approver",
      "comment": "Presupuesto disponible, aprobado"
    }
  ]
}
```

---

## PASO 5: Gestión de Compra

### Responsable
**Compras** (rol `purchasing`) o proceso manual

### Proceso
1. La solicitud aprobada queda visible para el equipo de compras
2. Se gestiona la adquisición con proveedores externos
3. El estado puede pasar a **PURCHASING** durante el proceso

> Este paso es actualmente manual/externo al sistema. La trazabilidad se mantiene mediante comentarios y documentos adjuntos.

---

## PASO 6: Recepción de Bienes

### Responsable
**Solicitante** o **Compras**

### Entrada
| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `is_partial` | boolean | ✅ | `true` = recepción parcial, `false` = recepción total |
| `comment` | string | ❌ | Observaciones de la recepción |

### Prerrequisitos
- Estado debe ser: APPROVED, PURCHASING o RECEIVED_PARTIAL

### Proceso

**Recepción Parcial** (`is_partial: true`):
1. Ejecuta `POST /api/v1/requests/{id}/receive`
2. Estado → **RECEIVED_PARTIAL**
3. Se puede recepcionar nuevamente cuando llegue el resto

**Recepción Total** (`is_partial: false`):
1. Ejecuta `POST /api/v1/requests/{id}/receive`
2. Estado → **COMPLETED**
3. El sistema **compromete el presupuesto** (mueve de reservado a ejecutado)
4. La solicitud queda cerrada

### Salida (Recepción Total)
```json
{
  "status": "COMPLETED",
  "logs": [
    {
      "action": "RECEIVED_FULL",
      "from_status": "APPROVED",
      "to_status": "COMPLETED",
      "comment": "Todos los ítems recibidos conforme"
    }
  ]
}
```

### Efecto en Presupuesto (Recepción Total)
| Campo | Antes | Después |
|-------|-------|---------|
| `reserved_amount` | $2,500.00 | -$2,500.00 |
| `executed_amount` | $0.00 | +$2,500.00 |
| `available_amount` | Sin cambio | Sin cambio |

---

## Flujos Alternativos

### Cancelación

| Campo | Valor |
|-------|-------|
| **Quién** | Solicitante (creador) |
| **Cuándo** | Estado DRAFT o pendiente de aprobación |
| **Endpoint** | `POST /api/v1/requests/{id}/cancel` |
| **Efecto presupuesto** | Libera fondos reservados |
| **Estado resultante** | CANCELLED |

### Re-envío tras Rechazo

| Campo | Valor |
|-------|-------|
| **Quién** | Solicitante (creador) |
| **Cuándo** | Estado REJECTED |
| **Proceso** | Corregir la solicitud y volver a enviar (submit) |
| **Estado resultante** | DRAFT → PENDING_TECHNICAL (reinicia el flujo) |

---

## Consultas y Seguimiento

### Timeline de Solicitud
```
GET /api/v1/requests/{id}/timeline
```

**Salida:**
```json
{
  "request_id": "uuid",
  "title": "Compra de insumos de oficina",
  "current_status": "PENDING_FINANCIAL",
  "current_step": 2,
  "total_steps": 2,
  "next_approver_role": "Financial Approver",
  "logs": [
    {
      "action": "SUBMITTED",
      "from_status": "DRAFT",
      "to_status": "PENDING_TECHNICAL",
      "timestamp": "2024-01-15T10:35:00Z"
    },
    {
      "action": "APPROVED",
      "from_status": "PENDING_TECHNICAL",
      "to_status": "PENDING_FINANCIAL",
      "actor_name": "Aprobador Técnico",
      "timestamp": "2024-01-15T14:20:00Z"
    }
  ]
}
```

### Listado con Filtros
```
GET /api/v1/requests/?status=PENDING_TECHNICAL&skip=0&limit=20
```

**Filtros disponibles:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | enum | Filtrar por estado |
| `search` | string | Buscar en título/descripción |
| `cost_center_id` | UUID | Filtrar por centro de costo |
| `min_amount` | decimal | Monto mínimo |
| `max_amount` | decimal | Monto máximo |
| `date_from` | date | Fecha desde |
| `date_to` | date | Fecha hasta |
| `skip` | int | Paginación: registros a saltar |
| `limit` | int | Paginación: cantidad por página (default 20) |

### Exportación
```
GET /api/v1/requests/export?format=excel
GET /api/v1/requests/export?format=pdf
```

---

## Resumen del Proceso Completo

| # | Paso | Responsable | Endpoint | Entrada Principal | Salida | Estado |
|---|------|------------|----------|-------------------|--------|--------|
| 1 | Crear | Solicitante | POST /requests/ | título, CC, ítems | Solicitud creada | DRAFT |
| 2 | Enviar | Solicitante | POST /requests/{id}/submit | - | Reserva presupuesto | PENDING_TECHNICAL |
| 3 | Aprobar Técnico | Aprobador Técnico | POST /requests/{id}/approve | comentario (opc) | Avanza paso | PENDING_FINANCIAL* |
| 4 | Aprobar Financiero | Aprobador Financiero | POST /requests/{id}/approve | comentario (opc) | Solicitud aprobada | APPROVED |
| 5 | Comprar | Compras | (manual) | - | En gestión | PURCHASING |
| 6 | Recepcionar | Solicitante/Compras | POST /requests/{id}/receive | is_partial, comentario | Cierre | COMPLETED |

*Solo si monto > $1,000. Si monto ≤ $1,000, paso 3 lleva directamente a APPROVED.
