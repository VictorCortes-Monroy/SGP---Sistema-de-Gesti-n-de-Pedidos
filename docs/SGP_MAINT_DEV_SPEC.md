# SGP — Módulo de Mantención de Equipos
## Especificación Técnica para Desarrollo
**Código:** SGP-MANT-DEV-2026-001 · **Versión:** 2.0 · **Fecha:** Marzo 2026

---

## 1. Objetivo

Implementar el módulo de mantención de equipos dentro del SGP (Sistema de Gestión de Compras). El módulo gestiona el ciclo completo de mantención para todos los tipos de evento: falla, mantención preventiva y movilización de equipo.

El proceso tiene dos niveles de cierre:
- **Cierre operativo (D5):** Documento de Término de Servicio firmado por Mantención → habilita facturación.
- **Cierre técnico documental (D6):** Certificado de Mantención emitido por Proveedor → respaldo para auditoría, NO bloquea facturación.

---

## 2. Entidades del Sistema

### 2.1 Actores (Roles)

| Rol | Código | Tipo | Responsabilidades principales |
|-----|--------|------|-------------------------------|
| Planificador de Mantenciones | `maintenance_planner` | Interno | Monitorea horómetros, genera SM, coordina ventanas operacionales |
| Jefe de Mantenimiento | `maintenance_chief` | Interno | Aprueba SM, valida gate, firma D5, coordina logística, gestiona certificado |
| Abastecimiento | `purchasing` | Interno | Genera OC, valida factura, gestiona cierre administrativo |
| Proveedor | `provider` | Externo | Cotiza, confirma fecha, ejecuta mantención, emite D6 y D7 |
| Finanzas | `finance` | Interno | Aprueba OC (según monto), procesa pago |
| Sistema | `system` | Plataforma | Registra gate, genera alertas SLA, mantiene trazabilidad |

### 2.2 Catálogo de Documentos

| ID | Documento | Genera | Recibe | Habilita | Req. Factura |
|----|-----------|--------|--------|----------|:------------:|
| D1 | Requerimiento de Servicio | Mantención | Proveedor + Abastecimiento | D2 (Cotización) | ✅ |
| D2 | Cotización | Proveedor | Abastecimiento + Mantención | D3 (OC) | ✅ |
| D3 | Orden de Compra (OC) | Abastecimiento | Proveedor + Mantención | D4 (Confirmación) + Gate | ✅ |
| D4 | Confirmación de Fecha | Proveedor | Mantención + Abastecimiento | Gate de ejecución | ✅ |
| D5 | Documento de Término de Servicio | Mantención | Proveedor + Abastecimiento | D7 (Factura) — CIERRE OPERATIVO | ✅ |
| D6 | Certificado de Mantención | Proveedor | Mantención + Abastecimiento | Cierre técnico (auditoría) | ❌ |
| D7 | Factura | Proveedor | Abastecimiento + Finanzas | Pago → Cierre financiero | — |

---

## 3. Flujo del Proceso (14 pasos)

```
NECESIDAD → D1 → D2 → D3 → D4 → GATE (Mantención) → EJECUCIÓN → D5 → D7 → PAGO → D6 (auditoría)
```

### Paso 1 — Detección de necesidad
- **Responsable:** Planificador / Jefe Mantención
- **Trigger:** Falla reportada, umbral horómetro alcanzado, o movilización requerida
- **Output:** Necesidad identificada

### Paso 2 — Generación del Requerimiento (D1)
- **Responsable:** Mantención
- **Campos:** equipo, tipo_evento (FALLA|PM|MOVILIZACION), alcance, urgencia, datos técnicos
- **Regla:** Se envía a Proveedor Y se copia a Abastecimiento simultáneamente
- **SLA:** 24 horas
- **Output:** D1 generado y distribuido

### Paso 3 — Cotización del Proveedor (D2)
- **Responsable:** Proveedor
- **Campos:** monto, detalle trabajos, plazo estimado, disponibilidad mecánicos
- **Se envía a:** Abastecimiento + Mantención
- **SLA:** 48 horas
- **Output:** D2 recibido por ambas áreas

### Paso 4 — Generación y Aprobación de OC (D3)
- **Responsable:** Abastecimiento
- **Proceso:** Genera OC → flujo aprobación SGP (según monto/CC/empresa) → libera
- **SLA:** 24-48 horas para aprobación y liberación completa
- **Distribución:** OC liberada se envía a Proveedor Y Mantención
- **Output:** D3 liberada

### Paso 5 — Confirmación de Fecha (D4)
- **Responsable:** Proveedor
- **Trigger:** Recepción de D3
- **Contenido:** Fecha propuesta, disponibilidad, requisitos logísticos
- **SLA:** 48 horas
- **Output:** D4 comunicado a Mantención y Abastecimiento

### Paso 6 — Coordinación logística
- **Responsable:** Jefe Mantención
- **Acciones:** Programar cama baja (si aplica), notificar Operaciones de indisponibilidad
- **En paralelo con:** Paso 5

### Paso 7 — GATE: Validación pre-ejecución
- **Responsable operacional:** Mantención
- **Registra:** Sistema
- **Condiciones:** (1) D3 OC liberada, (2) D4 fecha confirmada, (3) Logística programada
- **Si 3/3 OK:** Mantención autoriza ejecución. Sistema registra validación.
- **Si falta alguna:** Ejecución bloqueada hasta regularizar.
- **Nota:** La responsabilidad operacional es de Mantención. El sistema registra y mantiene trazabilidad.

### Paso 8 — Ejecución de mantención
- **Responsable:** Proveedor
- **Precondición:** Gate validado
- **Duración:** Variable según tipo y complejidad
- **D6 debe llegar:** Durante la semana del servicio o máx. 1 semana después

### Paso 9 — Validación mecánica + Documento de Término (D5)
- **Responsable:** Mantención (Jefe Mant.)
- **Acción:** Valida mecánicamente que el servicio se realizó correctamente. Si conforme, firma D5.
- **D5 = CIERRE OPERATIVO → habilita facturación**
- **Si no conforme:** Devuelve a proveedor para subsanación
- **SLA:** 24 horas post-finalización del servicio

### Paso 10 — Facturación (D7)
- **Responsable:** Proveedor
- **Requisitos (5 docs):** D1 + D2 + D3 + D4 + D5
- **Si falta cualquiera:** Factura no procede
- **Regla 30 días:** Si pasan 30 días desde D3 sin 5 requisitos → Abastecimiento rechaza

### Paso 11 — Validación de Factura
- **Responsable:** Abastecimiento
- **Verifica:** 5 documentos completos y consistentes
- **Si conforme:** Aprueba y envía a Finanzas
- **Si falta docs:** Rechaza y notifica proveedor

### Paso 12 — Pago
- **Responsable:** Finanzas
- **Condición:** 30 días desde factura aceptada

### Paso 13 — Certificado de Mantención (D6)
- **Responsable:** Proveedor (Mantención gestiona seguimiento)
- **Puede llegar:** Antes, durante o después de facturación
- **NO es requisito para facturar**
- **SLA:** 24-72 horas post-ejecución
- **Es obligatorio para:** Cierre técnico, auditoría, expediente completo

### Paso 14 — Cierre formal
- **Responsable:** Sistema
- **Condición:** Expediente digital completo (D1-D7), todos timestamps y responsables registrados

---

## 4. Reglas de Negocio

| ID | Regla | Tipo | Verifica |
|----|-------|------|----------|
| RN1 | Todo requerimiento (D1) DEBE copiarse a Abastecimiento al enviar al proveedor | Obligatoria | Sistema |
| RN2 | OC debe generarse y liberarse en 24-48 hrs desde cotización | SLA | Sistema |
| RN3 | OC liberada debe enviarse a Proveedor Y Mantención | Obligatoria | Abastecimiento |
| RN4 | Mantención valida gate pre-ejecución: D3 + D4 + logística OK | Gate | Mantención |
| RN5 | Sistema registra validación del gate con trazabilidad | Registro | Sistema |
| RN6 | Mantención firma D5 post-ejecución (cierre operativo) | Obligatoria | Mantención |
| RN7 | Proveedor emite D6 en 24-72 hrs (no bloquea factura) | SLA | Mantención |
| RN8 | Facturación requiere 5 docs: D1+D2+D3+D4+D5 | Bloqueo | Abastecimiento |
| RN9 | 30 días post-OC sin 5 requisitos → rechazo de factura | Bloqueo | Abastecimiento |
| RN10 | Condición de pago: 30 días desde factura aceptada | Contractual | Finanzas |

---

## 5. Modelo de Datos

### 5.1 Tablas Nuevas

#### `maint_service_requests` — Solicitud/Requerimiento de Servicio (entidad central)

```sql
CREATE TABLE maint_service_requests (
  id                    SERIAL PRIMARY KEY,
  code                  VARCHAR(20) NOT NULL UNIQUE,  -- REQ-YYYY-NNNN
  
  -- Tipo de evento
  event_type            VARCHAR(20) NOT NULL CHECK (event_type IN ('FALLA','PM','MOVILIZACION')),
  urgency               VARCHAR(10) NOT NULL CHECK (urgency IN ('NORMAL','URGENTE','CRITICA')),
  
  -- Equipo
  equipment_id          INTEGER REFERENCES maint_equipment(id),
  equipment_horometer   INTEGER,
  
  -- Proveedor
  provider_id           INTEGER REFERENCES maint_providers(id),
  
  -- Financiero
  company_id            INTEGER REFERENCES companies(id),
  cost_center_id        INTEGER REFERENCES cost_centers(id),
  estimated_cost        DECIMAL(14,2),
  
  -- Alcance
  description           TEXT NOT NULL,
  scope_detail          TEXT,
  planned_date          DATE,
  
  -- Estado del proceso
  status                VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  
  -- Documentos (IDs de archivos o referencias)
  d1_requirement_id     INTEGER,               -- Requerimiento generado
  d2_quotation_id       INTEGER,               -- Cotización recibida
  d3_purchase_order_id  INTEGER,               -- Ref a OC en SGP
  d3_oc_code            VARCHAR(20),           -- Código OC (OC-YYYY-NNNN)
  d4_date_confirmed     BOOLEAN DEFAULT FALSE,
  d4_confirmed_date     DATE,
  d5_termination_doc_id INTEGER,               -- Doc. Término firmado
  d5_signed_at          TIMESTAMPTZ,
  d5_signed_by          INTEGER REFERENCES users(id),
  d6_certificate_id     INTEGER,               -- Certificado proveedor
  d6_received_at        TIMESTAMPTZ,
  d7_invoice_id         INTEGER,               -- Factura
  d7_invoice_number     VARCHAR(50),
  
  -- Gate
  gate_validated        BOOLEAN DEFAULT FALSE,
  gate_validated_at     TIMESTAMPTZ,
  gate_validated_by     INTEGER REFERENCES users(id),
  logistics_scheduled   BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            INTEGER REFERENCES users(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Vinculación con SGP
  purchase_request_id   INTEGER REFERENCES requests(id)  -- Solicitud de compra en SGP
);
```

**Estados posibles:**

```
DRAFT → SENT → QUOTED → OC_PENDING → OC_RELEASED → DATE_CONFIRMED → GATE_VALIDATED → IN_EXECUTION → TERMINATED → INVOICED → PAID → CLOSED
                                                                                                                      ↗
                                                                                              CERTIFICATE_RECEIVED ──┘ (paralelo)
```

| Status | Descripción | Transición requiere |
|--------|-------------|---------------------|
| `DRAFT` | Borrador creado por planificador | — |
| `SENT` | D1 enviado a proveedor + abastecimiento | D1 generado |
| `QUOTED` | D2 cotización recibida | D2 registrado |
| `OC_PENDING` | OC en flujo de aprobación | Solicitud de compra creada |
| `OC_RELEASED` | D3 OC liberada y distribuida | OC aprobada en SGP |
| `DATE_CONFIRMED` | D4 proveedor confirmó fecha | d4_confirmed_date != null |
| `GATE_VALIDATED` | Mantención validó gate (D3+D4+logística) | gate_validated = true |
| `IN_EXECUTION` | Mantención en curso | gate validado |
| `TERMINATED` | D5 firmado (cierre operativo) | d5_signed_at != null |
| `INVOICED` | D7 factura emitida | D1+D2+D3+D4+D5 completos |
| `PAID` | Pago procesado | Finanzas confirma |
| `CLOSED` | Expediente completo | D1-D7 todos presentes |

#### `maint_equipment` — Catálogo de equipos

```sql
CREATE TABLE maint_equipment (
  id                    SERIAL PRIMARY KEY,
  code                  VARCHAR(30) NOT NULL UNIQUE,  -- Código interno
  name                  VARCHAR(200) NOT NULL,
  equipment_type        VARCHAR(50) NOT NULL,
  brand                 VARCHAR(100),
  model                 VARCHAR(100),
  year                  INTEGER,
  serial_number         VARCHAR(100),
  
  -- Horómetro
  current_horometer     INTEGER DEFAULT 0,
  maintenance_interval  INTEGER,                 -- Cada cuántas horas
  next_maintenance_due  INTEGER,                 -- Horómetro de próxima mantención
  
  -- Estado
  status                VARCHAR(20) DEFAULT 'OPERATIVE',  -- OPERATIVE, IN_MAINTENANCE, OUT_OF_SERVICE
  location              VARCHAR(100),
  
  -- Certificado vigente
  last_certificate_id   INTEGER,
  last_maintenance_date DATE,
  
  company_id            INTEGER REFERENCES companies(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### `maint_providers` — Proveedores de mantención

```sql
CREATE TABLE maint_providers (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(200) NOT NULL,
  rut                   VARCHAR(20),
  contact_name          VARCHAR(200),
  contact_email         VARCHAR(200),
  contact_phone         VARCHAR(50),
  address               TEXT,
  payment_terms_days    INTEGER DEFAULT 30,
  active                BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### `maint_provider_equipment_types` — Qué proveedores atienden qué tipos

```sql
CREATE TABLE maint_provider_equipment_types (
  id                    SERIAL PRIMARY KEY,
  provider_id           INTEGER REFERENCES maint_providers(id),
  equipment_type        VARCHAR(50) NOT NULL,
  notes                 TEXT,
  UNIQUE(provider_id, equipment_type)
);
```

#### `maint_documents` — Documentos adjuntos del proceso

```sql
CREATE TABLE maint_documents (
  id                    SERIAL PRIMARY KEY,
  service_request_id    INTEGER REFERENCES maint_service_requests(id),
  document_type         VARCHAR(5) NOT NULL CHECK (document_type IN ('D1','D2','D3','D4','D5','D6','D7')),
  file_name             VARCHAR(500),
  file_path             TEXT,
  file_size             INTEGER,
  mime_type             VARCHAR(100),
  uploaded_by           INTEGER REFERENCES users(id),
  uploaded_at           TIMESTAMPTZ DEFAULT NOW(),
  notes                 TEXT
);
```

#### `maint_transport_schedule` — Programación de cama baja

```sql
CREATE TABLE maint_transport_schedule (
  id                    SERIAL PRIMARY KEY,
  service_request_id    INTEGER REFERENCES maint_service_requests(id),
  equipment_id          INTEGER REFERENCES maint_equipment(id),
  direction             VARCHAR(10) NOT NULL CHECK (direction IN ('IDA','VUELTA')),
  scheduled_date        DATE NOT NULL,
  actual_date           DATE,
  origin                VARCHAR(200),
  destination           VARCHAR(200),
  status                VARCHAR(20) DEFAULT 'PROGRAMADO', -- PROGRAMADO, EN_TRANSITO, COMPLETADO, CANCELADO
  notes                 TEXT,
  created_by            INTEGER REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### `maint_audit_log` — Trazabilidad del proceso

```sql
CREATE TABLE maint_audit_log (
  id                    SERIAL PRIMARY KEY,
  service_request_id    INTEGER REFERENCES maint_service_requests(id),
  action                VARCHAR(50) NOT NULL,
  from_status           VARCHAR(30),
  to_status             VARCHAR(30),
  performed_by          INTEGER REFERENCES users(id),
  performed_at          TIMESTAMPTZ DEFAULT NOW(),
  ip_address            VARCHAR(45),
  details               JSONB,
  comment               TEXT
);
```

**Acciones del audit log:**

```
CREATED, SENT, QUOTATION_RECEIVED, OC_REQUESTED, OC_APPROVED, OC_RELEASED, 
DATE_CONFIRMED, LOGISTICS_SCHEDULED, GATE_VALIDATED, GATE_BLOCKED,
EXECUTION_STARTED, EXECUTION_COMPLETED, D5_SIGNED, D5_REJECTED,
CERTIFICATE_RECEIVED, INVOICE_RECEIVED, INVOICE_VALIDATED, INVOICE_REJECTED,
PAYMENT_PROCESSED, CLOSED
```

### 5.2 Integración con SGP existente

La integración con el SGP de compras se hace vía la tabla `requests` existente:

```
Al aprobar D2 (cotización) → se crea una solicitud de compra en requests (SGP)
    ↓
SGP gestiona aprobación y generación de OC
    ↓
Cuando OC se libera → webhook/trigger actualiza maint_service_requests.d3_oc_code
```

**Campos opcionales a agregar en `requests` (SGP):**

```sql
ALTER TABLE requests ADD COLUMN source_type VARCHAR(20);  -- 'MAINTENANCE' | 'DIRECT' | null
ALTER TABLE requests ADD COLUMN source_reference_id INTEGER; -- maint_service_requests.id
```

---

## 6. API Endpoints

### 6.1 Equipos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/equipment` | Listar equipos (filtros: status, type, company) |
| GET | `/api/v1/maintenance/equipment/:id` | Detalle de equipo |
| POST | `/api/v1/maintenance/equipment` | Crear equipo |
| PUT | `/api/v1/maintenance/equipment/:id` | Actualizar equipo |
| PATCH | `/api/v1/maintenance/equipment/:id/horometer` | Actualizar horómetro |

### 6.2 Proveedores

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/providers` | Listar proveedores (filtro: equipment_type) |
| GET | `/api/v1/maintenance/providers/:id` | Detalle proveedor |
| POST | `/api/v1/maintenance/providers` | Crear proveedor |
| PUT | `/api/v1/maintenance/providers/:id` | Actualizar proveedor |

### 6.3 Solicitudes de Servicio (entidad central)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/requests` | Listar solicitudes (filtros: status, event_type, equipment, provider) |
| GET | `/api/v1/maintenance/requests/:id` | Detalle completo con documentos y timeline |
| POST | `/api/v1/maintenance/requests` | Crear solicitud (DRAFT) |
| PUT | `/api/v1/maintenance/requests/:id` | Actualizar solicitud (solo en DRAFT) |

### 6.4 Transiciones de Estado

| Método | Endpoint | Status from → to | Rol |
|--------|----------|-------------------|-----|
| POST | `/api/v1/maintenance/requests/:id/send` | DRAFT → SENT | maintenance_planner |
| POST | `/api/v1/maintenance/requests/:id/register-quotation` | SENT → QUOTED | purchasing |
| POST | `/api/v1/maintenance/requests/:id/request-oc` | QUOTED → OC_PENDING | purchasing |
| POST | `/api/v1/maintenance/requests/:id/release-oc` | OC_PENDING → OC_RELEASED | purchasing |
| POST | `/api/v1/maintenance/requests/:id/confirm-date` | OC_RELEASED → DATE_CONFIRMED | maintenance_chief |
| POST | `/api/v1/maintenance/requests/:id/validate-gate` | DATE_CONFIRMED → GATE_VALIDATED | maintenance_chief |
| POST | `/api/v1/maintenance/requests/:id/start-execution` | GATE_VALIDATED → IN_EXECUTION | maintenance_chief |
| POST | `/api/v1/maintenance/requests/:id/sign-termination` | IN_EXECUTION → TERMINATED | maintenance_chief |
| POST | `/api/v1/maintenance/requests/:id/register-invoice` | TERMINATED → INVOICED | purchasing |
| POST | `/api/v1/maintenance/requests/:id/register-payment` | INVOICED → PAID | finance |
| POST | `/api/v1/maintenance/requests/:id/close` | PAID → CLOSED | system |

**Endpoints independientes (no secuenciales):**

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/maintenance/requests/:id/register-certificate` | Registra D6 (puede llegar en cualquier momento post-ejecución) |
| POST | `/api/v1/maintenance/requests/:id/reject-invoice` | Rechaza factura (Abastecimiento) |

### 6.5 Gate de Control

```
POST /api/v1/maintenance/requests/:id/validate-gate
```

**Precondiciones que Mantención debe validar:**

```json
{
  "conditions": {
    "oc_released": true,        // d3_oc_code != null
    "date_confirmed": true,     // d4_confirmed_date != null
    "logistics_scheduled": true  // logistics_scheduled = true
  },
  "gate_approved": true,        // all conditions met
  "missing": []                 // lista de condiciones faltantes
}
```

**Comportamiento:**
- Mantención es responsable de validar estas condiciones antes de autorizar
- El sistema registra la validación en `maint_audit_log` con action=`GATE_VALIDATED`
- Si alguna condición falta, el endpoint retorna error con detalle de lo faltante
- No es automático: Mantención explícitamente valida el gate

### 6.6 Documentos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/v1/maintenance/requests/:id/documents` | Subir documento (D1-D7) |
| GET | `/api/v1/maintenance/requests/:id/documents` | Listar documentos de la solicitud |
| GET | `/api/v1/maintenance/documents/:doc_id/download` | Descargar documento |

### 6.7 Transporte (Cama Baja)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/transport/schedule` | Calendario de cama baja (filtros: fecha, status) |
| POST | `/api/v1/maintenance/transport/schedule` | Programar viaje |
| PATCH | `/api/v1/maintenance/transport/schedule/:id` | Actualizar viaje (completar, cancelar) |

### 6.8 Métricas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/maintenance/metrics` | Métricas generales |
| GET | `/api/v1/maintenance/requests/:id/timeline` | Timeline completo de una solicitud |

**Métricas principales:**
- Tiempo promedio ciclo completo (D1 → CLOSED)
- Tiempo promedio OC (D2 → D3 liberada)
- % mantenciones con D5 firmado en SLA (24 hrs)
- % certificados (D6) recibidos en SLA (72 hrs)
- Tasa de rechazo de facturas
- Utilización de cama baja
- Cantidad de gates bloqueados vs. aprobados

---

## 7. SLAs y Escalamientos

| Etapa | Owner | SLA | Escalamiento |
|-------|-------|-----|-------------|
| Generación requerimiento (D1) | Mantención | 24 hrs | Alerta a Jefe Mant. |
| Cotización (D2) | Proveedor | 48 hrs | Mantención busca alternativo |
| Generación + aprobación OC (D3) | Abastecimiento | 24-48 hrs | D2: warning. D3: jefatura. D4: gerencia |
| Confirmación fecha (D4) | Proveedor | 48 hrs | Mantención reprograma |
| Ejecución | Proveedor | Según alcance | Notificación + registro incumplimiento |
| Documento Término D5 | Mantención | 24 hrs post-ejecución | Alerta automática |
| Certificado D6 | Proveedor | 24-72 hrs | Mantención gestiona seguimiento |
| Condición pago | Finanzas | 30 días post-factura | Contractual |

---

## 8. Matriz RACI (resumen)

| # | Tarea | Mant. | Abast. | Prov. | Fin. | Sistema |
|---|-------|:-----:|:------:|:-----:|:----:|:-------:|
| 1 | Detección necesidad | **R** | — | — | — | — |
| 2 | Requerimiento D1 | **R** | I | I | — | R |
| 3 | Cotización D2 | — | I | **R** | — | — |
| 4 | OC D3 (gen+aprob) | — | **R** | — | A | R |
| 5 | Envío OC | I | **R** | I | — | R |
| 6 | Confirmación fecha D4 | I | I | **R** | — | — |
| 7 | Logística cama baja | **R** | — | C | — | — |
| 8 | Validación gate | **R** | — | — | — | I |
| 9 | Registro gate | I | — | — | — | **R** |
| 10 | Ejecución mantención | C | — | **R** | — | — |
| 11 | D5 Término servicio | **R** | I | I | — | R |
| 12 | Gestión certificado D6 | **R** | — | **R** | — | — |
| 13 | Emisión certificado D6 | I | I | **R** | — | — |
| 14 | Facturación D7 | — | I | **R** | I | — |
| 15 | Validación factura | — | **R** | — | I | R |
| 16 | Pago | — | — | I | **R** | R |
| 17 | Cierre | I | I | I | I | **R** |

---

## 9. Requisitos para Facturación (RN8)

Proveedor puede emitir D7 (factura) únicamente cuando cuenta con:

| # | Documento | Genera | Verifica |
|---|-----------|--------|----------|
| 1 | D1 — Requerimiento de Servicio | Mantención | Abastecimiento |
| 2 | D2 — Cotización | Proveedor | Abastecimiento |
| 3 | D3 — Orden de Compra liberada | Abastecimiento | Abastecimiento |
| 4 | D4 — Confirmación de fecha | Proveedor | Mantención |
| 5 | D5 — Doc. Término de Servicio firmado | Mantención | Abastecimiento |

**D6 (Certificado) NO es requisito para facturar.** Es respaldo técnico para auditoría.

**Regla de timeout:** Si pasan 30 días desde D3 sin tener D1+D2+D3+D4+D5 completos → Abastecimiento rechaza la factura.

---

## 10. Plan de Implementación

### Fase 0 — Levantamiento (2 semanas)
- Validar catálogo de equipos con Mantención
- Validar catálogo de proveedores por tipo de equipo
- Confirmar umbrales de horómetro por equipo
- Confirmar costos históricos por tipo de mantención
- Confirmar tiempo de viaje faena ↔ María Elena

### Fase 1 — Core: Equipos + Proveedores + Solicitud básica (3 semanas)
- Tablas: `maint_equipment`, `maint_providers`, `maint_provider_equipment_types`
- CRUD equipos y proveedores
- Crear solicitud (DRAFT → SENT → QUOTED)
- Subir documentos D1, D2
- **Criterio:** Planificador crea solicitud, se distribuye a proveedor y abastecimiento

### Fase 2 — OC + Gate + Ejecución (3 semanas)
- Integración con SGP: solicitud de compra automática al registrar cotización
- Estados OC_PENDING → OC_RELEASED → DATE_CONFIRMED
- Gate de control (endpoint validate-gate)
- Estados GATE_VALIDATED → IN_EXECUTION → TERMINATED
- D5 firma
- **Criterio:** Gate bloquea si falta D3+D4+logística. D5 habilita facturación.

### Fase 3 — Facturación + Cierre + Certificado (2 semanas)
- Estados INVOICED → PAID → CLOSED
- Validación de 5 requisitos para facturación
- Registro de D6 (independiente del flujo principal)
- Cierre formal con expediente completo
- **Criterio:** Ciclo E2E completo DRAFT → CLOSED

### Fase 4 — Transporte + Métricas + Dashboard (2 semanas)
- `maint_transport_schedule` + calendario cama baja
- Endpoint de métricas
- Timeline visual por solicitud
- Dashboard con KPIs
- **Criterio:** Métricas de SLA funcionando, calendario de cama baja operativo

### Fase 5 — Frontend (3 semanas)
- Listado de equipos
- Listado de solicitudes con filtros por estado
- Detalle de solicitud con timeline y documentos
- Formulario de validación gate
- Calendario de cama baja
- Dashboard de métricas

**Duración total estimada: ~13 semanas (3 meses)**

---

## 11. Estructura de Archivos Sugerida

```
app/
├── models/maintenance/
│   ├── equipment.py
│   ├── provider.py
│   ├── service_request.py
│   ├── document.py
│   ├── transport.py
│   └── audit_log.py
├── schemas/maintenance/
│   ├── equipment.py
│   ├── provider.py
│   ├── service_request.py
│   └── transport.py
├── services/maintenance/
│   ├── workflow.py          # Máquina de estados + transiciones
│   ├── gate.py              # Lógica del gate de control
│   ├── integration.py       # Vinculación con SGP
│   ├── sla.py               # Motor de SLAs y alertas
│   └── metrics.py           # Cálculo de métricas
└── api/api_v1/endpoints/maintenance/
    ├── equipment.py
    ├── providers.py
    ├── requests.py          # CRUD + transiciones
    ├── documents.py
    ├── transport.py
    └── metrics.py

frontend/src/
├── pages/maintenance/
│   ├── EquipmentList.jsx
│   ├── ServiceRequestList.jsx
│   ├── ServiceRequestDetail.jsx
│   ├── GateValidation.jsx
│   ├── TransportCalendar.jsx
│   └── Dashboard.jsx
└── components/maintenance/
    ├── StatusBadge.jsx
    ├── Timeline.jsx
    ├── DocumentUpload.jsx
    └── MetricsCards.jsx
```

---

## 12. Decisiones de Diseño Clave

1. **D5 habilita factura, D6 no.** Separa cierre operativo de cierre técnico. No bloquea flujo financiero por demora del certificado.

2. **Gate es responsabilidad de Mantención, no del sistema.** El sistema registra, pero Mantención decide operacionalmente. Esto es realista porque Mantención conoce el contexto operacional.

3. **D6 es independiente del flujo principal.** Puede llegar antes, durante o después de la facturación. Se registra como evento paralelo.

4. **Integración con SGP por extensión, no modificación.** Solo se agregan 2 columnas opcionales a `requests`. El módulo de mantención se agrega como módulo nuevo.

5. **Audit log reutilizable.** Misma estructura del SGP con acciones específicas del módulo de mantención.

---

*Fin del documento — SGP-MANT-DEV-2026-001 v2.0*
