# Instructivo: Solicitud de Pedido (SP)

> **Alcance:** procedimiento end-to-end para crear, aprobar, comprar y recepcionar una Solicitud de Pedido (SP) en el SGP.
> **Versión de arquitectura:** la aprobación financiera ya **no** vive en la SP — pasó a la **Orden de Compra (OC)** con doble visación Finance 1 / Finance 2.

---

## 1. Diagrama general

```
┌────────┐   submit    ┌────────────────────┐   approve   ┌──────────┐
│ DRAFT  ├────────────▶│ PENDING_TECHNICAL  ├────────────▶│ APPROVED │──┐
└───┬────┘             └────────┬───────────┘             └──────────┘  │
    │ cancel                    │ reject                                 │
    ▼                           ▼                                        │
┌──────────┐              ┌──────────┐                                   │
│CANCELLED │              │ REJECTED │◀─── resubmit ──── DRAFT           │
└──────────┘              └──────────┘                                   │
                                                                         │
           ┌─────────────────────────────────────────────────────────────┘
           ▼
    Crear OC desde la SP  (POST /api/v1/purchase-orders/)
           │
           ▼
    Aprobar OC (Finance 1 → Finance 2) → enviar → recibir
           │
           ▼
    Recepción sobre la SP (POST /api/v1/requests/{id}/receive)
           │
           ▼
   RECEIVED_PARTIAL  ─── o ──▶  COMPLETED  (commit de presupuesto)
```

Estados de la SP: `DRAFT`, `PENDING_TECHNICAL`, `APPROVED`, `PURCHASING`, `RECEIVED_PARTIAL`, `RECEIVED_FULL`, `COMPLETED`, `REJECTED`, `CANCELLED`.

---

## 2. Roles y qué puede hacer cada uno

| Rol | Crear SP | Enviar SP | Aprobar técnica | Comprar (crear OC) | Aprobar OC | Recepcionar |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `Requester` (Solicitante) | ✅ | ✅ (propias) | ❌ | ❌ | ❌ | ✅ (propias) |
| `Technical Approver` | — | — | ✅ | ❌ | ❌ | — |
| `Purchasing` | — | — | — | ✅ | ❌ | ✅ |
| `Financial Approver` / `Finance 2` | — | — | — | — | ✅ | — |
| `Admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Paso a paso

### PASO 1 — Crear SP (Solicitante)

**Endpoint:** `POST /api/v1/requests/`

| Campo | Tipo | Obligatorio | Notas |
|---|---|:---:|---|
| `title` | string | ✅ | Título breve |
| `description` | string | ❌ | |
| `cost_center_id` | UUID | ✅ | Centro de costo que financia |
| `purchase_type` | enum | ❌ | `INSUMOS` (default), `ACTIVOS_FIJOS`, `OTROS_SERVICIOS` |
| `items` | array | ✅ | Mínimo 1 ítem |

Cada ítem requiere: `description`, `quantity`, `unit_price` (opcional `sku`, `catalog_item_id`).

El sistema calcula `total_price` por ítem (`quantity × unit_price`) y `total_amount` sumando los ítems. La SP queda en **DRAFT**.

**Acciones disponibles en DRAFT:**
- Adjuntar documentos: `POST /api/v1/requests/{id}/documents` (PDF/Word/Excel/imágenes, máx 10 MB)
- Comentar: `POST /api/v1/requests/{id}/comments`
- Eliminar (soft delete): `DELETE /api/v1/requests/{id}`

---

### PASO 2 — Enviar a aprobación (Solicitante)

**Endpoint:** `POST /api/v1/requests/{id}/submit`

**Precondiciones:**
- La SP está en `DRAFT`.
- El usuario es el creador (`requester_id`).

**Qué ocurre:**
1. Se **reserva presupuesto** (`reserved_amount += total_amount`). ⚠️ No se valida saldo — reservas por sobre el disponible son permitidas por diseño (visibilidad, no control).
2. Se consulta la **Matriz de Aprobación** filtrando por empresa, CC y monto.
3. Se crea log `SUBMITTED` (DRAFT → PENDING_TECHNICAL) con IP.
4. Estado pasa a **`PENDING_TECHNICAL`**.

> Si no hay reglas de aprobación cargadas para el CC, la SP cae a `PENDING_TECHNICAL` de todas formas (fail-safe).

---

### PASO 3 — Aprobación técnica (Technical Approver)

**Aprobar:** `POST /api/v1/requests/{id}/approve`
**Rechazar:** `POST /api/v1/requests/{id}/reject`

**Body (ambos, opcional):**
```json
{ "comment": "texto libre" }
```

> ⚠️ El campo es **`comment`** (singular). `comments` se ignora silenciosamente.

**Aprobar:**
- Valida que el usuario tenga rol `Technical Approver`.
- Registra log `APPROVE` con IP y comentario.
- Estado → **`APPROVED`**. (La SP termina su workflow de aprobación aquí — la validación financiera se hace en la OC).

**Rechazar:**
- Estado → `REJECTED`.
- **Libera la reserva** (`reserved_amount -= total_amount`).
- El Solicitante puede corregir y re-enviar (queda en `DRAFT` otra vez tras editar).

---

### PASO 4 — Generar Orden de Compra (Purchasing)

**Endpoint:** `POST /api/v1/purchase-orders/` (con `request_id` de la SP aprobada).

> El endpoint legacy `POST /api/v1/requests/{id}/purchase` está **deprecado** y responde `410 Gone`. Usar siempre `/purchase-orders/`.

Una vez creada la OC, se pasa por el flujo **Finance 1 → Finance 2 → enviar al proveedor**. Ver el módulo de Órdenes de Compra para detalle.

---

### PASO 5 — Recepción (Solicitante o Compras)

**Endpoint:** `POST /api/v1/requests/{id}/receive`

**Body:**
```json
{ "is_partial": false, "comment": "Todo recibido conforme" }
```

**Precondiciones:** estado en `APPROVED`, `PURCHASING` o `RECEIVED_PARTIAL`.

- `is_partial: true`  → estado `RECEIVED_PARTIAL`, presupuesto intacto. Puedes volver a recepcionar.
- `is_partial: false` → estado `COMPLETED`, **commit de presupuesto** (`reserved_amount -= total`, `executed_amount += total`).

---

### PASO 6 — Cancelación (Solicitante)

**Endpoint:** `POST /api/v1/requests/{id}/cancel` — solo para `DRAFT`, `PENDING_TECHNICAL`.
Libera reserva si corresponde. Estado → `CANCELLED`.

---

## 4. Efecto en presupuesto — resumen

| Evento | `reserved_amount` | `executed_amount` |
|---|---|---|
| Crear SP (DRAFT) | — | — |
| Submit | **+ total** | — |
| Reject / Cancel (desde PENDING) | − total | — |
| Recepción total (COMPLETED) | − total | **+ total** |
| Recepción parcial | — | — |

`available_amount = total_amount − reserved_amount − executed_amount` (puede ser negativo; es esperado).

---

## 5. Consultas y seguimiento

| Qué | Endpoint |
|---|---|
| Detalle + audit trail | `GET /api/v1/requests/{id}` |
| Timeline (estado, próximo aprobador, logs) | `GET /api/v1/requests/{id}/timeline` |
| Listar con filtros + paginación | `GET /api/v1/requests/?status=&search=&min_amount=&...` |
| Exportar (Excel/PDF) | `GET /api/v1/requests/export?format=excel` |
| Documentos adjuntos | `GET /api/v1/requests/{id}/documents` |
| Comentarios | `GET /api/v1/requests/{id}/comments` |

Filtros de listado: `status`, `search` (ILIKE en título/desc), `cost_center_id`, `min_amount`, `max_amount`, `created_from`, `created_to`, `skip`, `limit`.

Visibilidad por rol:
- `Admin`, `Technical Approver`: ven todas.
- `Financial Approver`, `Finance 2`, `Purchasing`: ven las propias + todas las post-aprobación.
- `Requester` (otros): solo las propias.

---

## 6. Receta probada (cURL end-to-end)

Todos los comandos usan `localhost:8000`. Usuarios seed: `admin|requester|tech|financial@example.com` / password `password`.

```bash
# 1) Login como solicitante
TOK=$(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=requester@example.com&password=password" \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# 2) Crear SP
RID=$(curl -s -X POST http://localhost:8000/api/v1/requests/ \
  -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d '{"title":"Insumos oficina","cost_center_id":"<uuid-CC>",
       "items":[{"description":"Resma A4","quantity":50,"unit_price":5}]}' \
  | python -c "import sys,json;print(json.load(sys.stdin)['id'])")

# 3) Enviar a aprobación
curl -s -X POST http://localhost:8000/api/v1/requests/$RID/submit \
  -H "Authorization: Bearer $TOK"

# 4) Login como Technical Approver y aprobar
TECH=$(curl -s -X POST http://localhost:8000/api/v1/login/access-token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=tech@example.com&password=password" \
  | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

curl -s -X POST http://localhost:8000/api/v1/requests/$RID/approve \
  -H "Authorization: Bearer $TECH" -H "Content-Type: application/json" \
  -d '{"comment":"OK tecnico"}'

# 5) (OC se gestiona en /api/v1/purchase-orders/ — ver doc de OC)

# 6) Recepción total (commit de presupuesto)
ITEM_ID=<uuid-del-item>  # tomar de la respuesta del paso 2
curl -s -X POST http://localhost:8000/api/v1/requests/$RID/receive \
  -H "Authorization: Bearer $TECH" -H "Content-Type: application/json" \
  -d '{"is_partial":false,"comment":"Recibido conforme"}'

# 7) Verificar timeline
curl -s http://localhost:8000/api/v1/requests/$RID/timeline \
  -H "Authorization: Bearer $TECH" | python -m json.tool
```

---

## 7. Resumen operativo

| # | Paso | Responsable | Endpoint | Estado resultante |
|---|---|---|---|---|
| 1 | Crear | Solicitante | `POST /requests/` | DRAFT |
| 2 | Enviar | Solicitante | `POST /requests/{id}/submit` | PENDING_TECHNICAL (+reserva) |
| 3 | Aprobar técnicamente | Technical Approver | `POST /requests/{id}/approve` | APPROVED |
| 3b | Rechazar | Technical Approver | `POST /requests/{id}/reject` | REJECTED (−reserva) |
| 4 | Crear OC | Purchasing | `POST /purchase-orders/` | (OC) |
| 5 | Recepción total | Solicitante/Compras | `POST /requests/{id}/receive` | COMPLETED (+executed) |
| 5b | Recepción parcial | Solicitante/Compras | `POST /requests/{id}/receive` con `is_partial:true` | RECEIVED_PARTIAL |
| 6 | Cancelar | Solicitante | `POST /requests/{id}/cancel` | CANCELLED (−reserva) |

---

## 8. Buenas prácticas

- Adjunta cotizaciones o fichas técnicas **en DRAFT** antes de enviar — el aprobador las necesita.
- Usa `comment` en aprobaciones/rechazos; queda en el audit log con IP y timestamp.
- Consulta `GET /requests/{id}/timeline` para ver próximo aprobador y progreso.
- Si la SP cae en estado incorrecto, revisa que exista una regla en `ApprovalMatrix` para el CC y monto — sin reglas, el sistema sigue enviando a `PENDING_TECHNICAL` como fail-safe.
- El presupuesto en negativo es permitido y esperado: úsalo como señal para recomposiciones, no como bloqueo.
