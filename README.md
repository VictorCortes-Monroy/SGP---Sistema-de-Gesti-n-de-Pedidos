# SGP — Sistema de Gestión y Trazabilidad de Pedidos

Sistema web integral para la gestión de solicitudes de compra, control presupuestario y mantención preventiva/correctiva de equipos industriales. Desarrollado para T-METAL SPA.

---

## Objetivo

Digitalizar y trazabilizar el ciclo completo de compras y mantención en una organización industrial, eliminando el flujo documental en papel y garantizando que cada etapa —desde la solicitud hasta el pago— quede registrada, auditada y trazable en tiempo real.

**Principio rector del módulo de mantención:** *"El flujo documental va adelante o en paralelo al flujo físico, nunca detrás."*

---

## Alcance

| Módulo | Alcance |
|--------|---------|
| Solicitudes de Pedido | Ciclo completo: creación → aprobación técnica/financiera → compra → recepción → cierre |
| Presupuestos | Asignación por Centro de Costo, reserva automática, control de ejecución |
| Mantención | Ciclo SM completo: diagnóstico → cotización → OC → ejecución → recepción conforme → D5 → factura → pago |
| Administración | CRUD de usuarios, empresas, centros de costo y matriz de aprobación |
| Auditoría | Registro inmutable de cada acción con actor, IP y timestamp |
| Alertas SLA | Monitoreo automático de tiempos límite en solicitudes de mantención y equipos |

---

## Módulos y Funcionalidades

### 1. Solicitudes de Pedido

**Flujo de estados:** `DRAFT → PENDING_TECHNICAL → PENDING_FINANCIAL → APPROVED → PURCHASING → RECEIVED → COMPLETED`

- Creación de solicitudes con selector Empresa → Centro de Costo (cascada)
- Tipo de compra: `INSUMOS`, `ACTIVOS_FIJOS`, `OTROS_SERVICIOS`
- Adjunto de documentos (PDF, Word, Excel — máx. 10 MB por archivo)
- Ítems con descripción, SKU, cantidad y precio unitario
- Envío a flujo de aprobación con reserva automática de presupuesto (referencial, no bloqueante)
- Aprobación técnica y financiera según Matriz de Aprobación configurada
- Recepción parcial o total con commit de presupuesto
- Exportación a Excel / PDF
- Cancelación y reenvío desde estado REJECTED

### 2. Presupuestos

- Asignación de presupuesto anual por Centro de Costo
- Montos: `total_amount`, `reserved_amount` (solicitudes activas), `executed_amount` (completadas)
- `available_amount = total − reserved − executed`
- Dashboard con barras de utilización y alerta visual al superar el 80%
- Reporte consolidado por empresa y CC con exportación Excel/PDF
- El presupuesto es **referencial**: la solicitud se publica aunque se exceda el monto disponible

### 3. Módulo de Mantención (SM)

#### Flujo de estados completo:
```
DRAFT → PENDING_APPROVAL → APPROVED → QUOTED_PENDING
  → AWAITING_PREREQUISITES → READY_FOR_EXECUTION
  → IN_TRANSIT_TO_WORKSHOP → IN_MAINTENANCE → PENDING_RECEPTION
  → PENDING_CERTIFICATE → IN_TRANSIT_TO_FIELD
  → COMPLETED → PENDING_D5 → INVOICING_READY → PENDING_PAYMENT → CLOSED
```

#### Documentos del flujo comercial:
| Doc | Nombre | Etapa |
|-----|--------|-------|
| D1 | Orden de Compra (OC) | Gate de control |
| D2 | Cotización del proveedor | Registro post-aprobación |
| D3 | Confirmación de proveedor | Gate de control |
| D4 | Programación transporte (cama baja) | Gate de control |
| D5 | Acta de término operativo | Cierre operativo |
| D6 | Certificado de mantención | Evidencia técnica |
| D7 | Factura / Comprobante de pago | Cierre financiero |

#### Funcionalidades:
- **CRUD de equipos** con código auto-generado `{MARCA3}-{MODELO4}-{AÑO2}-{VIN4}` (ej: `CAT-336D-20-4X2A`)
- **Horómetro**: actualización y proyección de próxima mantención
- **CRUD de proveedores** con tipos de equipo asociados
- **Código correlativo SM**: formato `SM-YYYY-NNNN` generado por secuencia PostgreSQL
- **Gate de control**: auto-transición a READY_FOR_EXECUTION cuando se cumplen OC + proveedor confirmado + transporte programado
- **Integración SGP (RF-M07)**: al aprobar una SM, se crea automáticamente una Solicitud de Pedido en el módulo comercial
- **Checklist de recepción conforme**: 4 grupos (verificación de alcance, condición del equipo, pruebas operacionales, documentación del proveedor)
- **Upload de certificado PDF** con hash SHA-256
- **Cierre con factura**: `invoice_number`, `invoice_amount`
- **RN8**: el registro de factura valida la presencia de los 5 documentos obligatorios (D1-D5)
- **Analytics**: KPIs por tipo PM/CM, tasa de recepción conforme, tiempo ciclo promedio, alertas próximas
- **Exportación** a Excel del listado de SMs

### 4. Alertas SLA

Motor automático (APScheduler, intervalo: 1 hora) que detecta y registra violaciones de tiempo:

| Alerta | Condición | Destinatario |
|--------|-----------|--------------|
| `SLA_PENDING_APPROVAL` | SM en PENDING_APPROVAL > 16h | `maintenance_chief` |
| `SLA_PROVIDER_CONFIRM` | SM en AWAITING_PREREQUISITES sin proveedor confirmado > 24h | `maintenance_planner` |
| `SLA_RECEPTION` | SM en PENDING_RECEPTION > 8h | `maintenance_chief` |
| `SLA_EQUIPMENT_DUE` | Equipo con < 10% de intervalo PM restante | `maintenance_planner` |

- Alertas deduplicadas: no genera duplicados, actualiza horas si ya existe una activa
- Endpoint manual `POST /maintenance/alerts/run-checks` (Admin)
- Resolución individual con timestamp
- Badge en sidebar con conteo de alertas no leídas (refresco cada 5 min)

### 5. Panel de Administración

- **Usuarios**: CRUD completo, asignación de rol, activar/desactivar
- **Empresas**: CRUD con validación de RUT/tax_id único
- **Centros de Costo**: CRUD con filtro por empresa
- **Matriz de Aprobación**: reglas por empresa / CC / rol / monto mínimo
  - Paso 1 (Técnico): monto ≥ $0
  - Paso 2 (Financiero): monto ≥ $1.000
- **Auditoría**: log inmutable de todas las acciones del sistema; filtros por fecha, actor, solicitud y tipo de acción; exportación Excel/PDF

### 6. Dashboard

- Distribución de solicitudes por estado (pills clickeables)
- Acciones pendientes según rol del usuario autenticado
- Resumen presupuestario con alertas visuales de sobreutilización
- Acceso rápido a las últimas solicitudes con actividad reciente

---

## Roles y Permisos

| Rol | Descripción |
|-----|-------------|
| `Admin` | Acceso total: CRUD usuarios, empresas, CC, matriz, auditoría y alertas |
| `Solicitante` | Crear, editar y cancelar sus propias solicitudes de pedido |
| `Aprobador Técnico` | Aprobar/rechazar solicitudes en PENDING_TECHNICAL |
| `Aprobador Financiero` | Aprobar/rechazar solicitudes en PENDING_FINANCIAL |
| `maintenance_planner` | Crear y gestionar SMs, equipos y proveedores; visualizar alertas SLA |
| `maintenance_chief` | Aprobar SMs, gestionar recepción conforme, firmar D5 |
| `purchasing` (Abastecimiento) | Registrar cotización D2, vincular OC, registrar factura |
| `finance` (Finanzas) | Confirmar pago y cierre definitivo de SM |

---

## Tech Stack

| Capa | Tecnología |
|------|-----------|
| Backend | FastAPI (Python 3.11+), async/await |
| Base de datos | PostgreSQL 15 |
| ORM | SQLAlchemy async + asyncpg |
| Migraciones | Alembic |
| Autenticación | JWT (python-jose) + bcrypt (passlib) |
| Validación | Pydantic v2 |
| Background jobs | APScheduler |
| Exportaciones | openpyxl (Excel), reportlab (PDF) |
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Estado | TanStack Query v5 + Zustand |
| Router | React Router v6 |
| Infra | Docker + Docker Compose |

---

## Estructura del Proyecto

```
app/
├── api/api_v1/endpoints/
│   ├── login.py              # Autenticación JWT
│   ├── users.py              # CRUD usuarios + roles
│   ├── requests.py           # Ciclo solicitudes de pedido + adjuntos
│   ├── budgets.py            # Presupuestos y reportes
│   ├── organizations.py      # Empresas y centros de costo
│   ├── approval_matrix.py    # Matriz de aprobación
│   ├── dashboard.py          # Endpoint consolidado de dashboard
│   ├── audit.py              # Logs de auditoría + exportación
│   └── maintenance/
│       ├── equipment.py      # CRUD equipos + horómetro
│       ├── providers.py      # CRUD proveedores
│       ├── requests.py       # Ciclo SM completo (18 endpoints)
│       ├── documents.py      # Upload/download D1-D7
│       ├── analytics.py      # KPIs y métricas
│       └── alerts.py         # Alertas SLA
├── models/                   # SQLAlchemy ORM
├── schemas/                  # Pydantic v2
├── services/
│   ├── workflow.py           # Motor de aprobaciones (FSM RequestStatus)
│   ├── budget_service.py     # Reserva/commit/liberación de fondos
│   ├── export_service.py     # Generación Excel y PDF
│   └── maintenance/
│       ├── sm_service.py     # FSM de estados SM (13 estados)
│       └── sla_service.py    # Verificación automática de SLAs
frontend/src/
├── pages/                    # Vistas por módulo
├── components/               # Componentes UI reutilizables
├── api/                      # Clientes HTTP por dominio
├── hooks/                    # TanStack Query hooks
└── stores/                   # Zustand (auth, UI state)
alembic/versions/             # 7 migraciones incrementales
tests/                        # pytest async (~112 tests, ~94% cobertura)
```

---

## Cómo Ejecutar

### Requisitos
- Docker Desktop instalado y en ejecución

### Levantar el sistema

```bash
# Clonar el repositorio
git clone https://github.com/VictorCortes-Monroy/SGP---Sistema-de-Gesti-n-de-Pedidos.git
cd SGP---Sistema-de-Gesti-n-de-Pedidos

# Levantar todos los servicios (DB + API + Frontend)
docker-compose up --build

# Accesos:
# Frontend: http://localhost:3000
# API REST: http://localhost:8000
# Swagger:  http://localhost:8000/api/v1/openapi.json
```

### Usuarios de prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| `admin@example.com` | `password` | Admin |
| `requester@example.com` | `password` | Solicitante |
| `tech@example.com` | `password` | Aprobador Técnico |
| `financial@example.com` | `password` | Aprobador Financiero |
| `purchasing@example.com` | `password` | Abastecimiento |
| `finance@example.com` | `password` | Finanzas |

### Variables de entorno (`.env`)

```env
POSTGRES_SERVER=db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=sgp_db
POSTGRES_PORT=5432
SECRET_KEY=<cambiar-en-produccion>
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Ejecutar tests

```bash
docker-compose exec app pytest --cov=app --cov-report=term-missing
# Resultado esperado: ~112 tests, cobertura ~94%
```

---

## API — Endpoints Principales

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/login/access-token` | Obtener token JWT |

### Solicitudes de Pedido
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/v1/requests/` | Listar con filtros / Crear |
| GET | `/api/v1/requests/{id}` | Detalle con timeline |
| POST | `/api/v1/requests/{id}/submit` | Enviar a aprobación |
| POST | `/api/v1/requests/{id}/approve` | Aprobar |
| POST | `/api/v1/requests/{id}/reject` | Rechazar |
| POST | `/api/v1/requests/{id}/receive` | Recepción parcial/total |
| POST | `/api/v1/requests/{id}/documents` | Adjuntar documento |
| GET | `/api/v1/requests/documents/{id}/download` | Descargar adjunto |
| GET | `/api/v1/requests/export` | Exportar Excel/PDF |

### Mantención
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/v1/maintenance/equipment/` | CRUD equipos |
| GET/POST | `/api/v1/maintenance/requests/` | CRUD SMs |
| POST | `/api/v1/maintenance/requests/{id}/submit` | DRAFT → PENDING_APPROVAL |
| POST | `/api/v1/maintenance/requests/{id}/approve` | → QUOTED_PENDING |
| POST | `/api/v1/maintenance/requests/{id}/register-quotation` | D2 → AWAITING_PREREQUISITES |
| POST | `/api/v1/maintenance/requests/{id}/confirm-provider` | Gate: proveedor |
| POST | `/api/v1/maintenance/requests/{id}/schedule-transport` | Gate: transporte |
| POST | `/api/v1/maintenance/requests/{id}/link-purchase-order` | Gate: OC (D1) |
| POST | `/api/v1/maintenance/requests/{id}/start-execution` | → IN_TRANSIT_TO_WORKSHOP |
| POST | `/api/v1/maintenance/requests/{id}/reception` | Recepción conforme + checklist |
| POST | `/api/v1/maintenance/requests/{id}/sign-d5` | → INVOICING_READY |
| POST | `/api/v1/maintenance/requests/{id}/register-invoice` | → PENDING_PAYMENT |
| POST | `/api/v1/maintenance/requests/{id}/confirm-payment` | → CLOSED |
| GET | `/api/v1/maintenance/alerts/` | Alertas SLA activas |
| POST | `/api/v1/maintenance/alerts/run-checks` | Ejecutar verificación manual (Admin) |

---

## Migraciones Alembic

| Revisión | Descripción |
|----------|-------------|
| `ecb18635f3c0` | Esquema inicial: usuarios, solicitudes, presupuestos, workflow |
| `3d0da7ae3ed8` | Módulo de mantención (tablas `maint_*`) |
| `7862e3d1b170` | Secuencia correlativa SM (`SM-YYYY-NNNN`) |
| `a1b2c3d4e5f6` | Flujo comercial extendido (campos D2, D5, pago en SM) |
| `b1c2d3e4f5a6` | Tabla `maint_documents` (D1-D7) |
| `c1d2e3f4a5b6` | Campo `purchase_type` y tabla `request_documents` |
| `d1e2f3a4b5c6` | Tabla `maint_alerts` (SLA engine) |

---

## Estado del Proyecto

| Módulo | Estado |
|--------|--------|
| Autenticación JWT | ✅ Completo |
| Solicitudes de Pedido + adjuntos | ✅ Completo |
| Presupuestos + reportes | ✅ Completo |
| Motor de aprobaciones | ✅ Completo |
| Dashboard analítico | ✅ Completo |
| Auditoría exportable | ✅ Completo |
| Panel de administración | ✅ Completo |
| Módulo de Mantención (M0–M5) | ✅ Completo |
| Flujo Comercial SM (D1–D7) | ✅ Completo |
| SLA Engine + Alertas (M6) | ✅ Completo |
| Tests (~112, cobertura ~94%) | ✅ Completo |
| Notificaciones email (SLA + aprobaciones) | ⏳ Diferido |
| Rate limiting / CORS por entorno | ⏳ Diferido |
