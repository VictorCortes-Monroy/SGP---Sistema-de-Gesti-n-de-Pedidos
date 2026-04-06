# Guía de Administración - SGP

## Objetivo
Documentar las operaciones de administración del sistema: gestión de usuarios, organizaciones, matriz de aprobación, auditoría e infraestructura.

---

## 1. Gestión de Usuarios

### 1.1 Crear Usuario

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `email` | string | ✅ | Email único (usado como login) |
| `password` | string | ✅ | Contraseña (se almacena hasheada con bcrypt) |
| `full_name` | string | ❌ | Nombre completo |
| `role_id` | UUID | ✅ | Rol asignado |
| `is_active` | boolean | ❌ | Activo (default: true) |

**Endpoint:** `POST /api/v1/users/`  
**Acceso:** Solo Admin

**Ejemplo:**
```json
POST /api/v1/users/
{
  "email": "nuevo.usuario@empresa.com",
  "password": "contraseña_segura_123",
  "full_name": "Juan Pérez",
  "role_id": "uuid-del-rol-requester"
}
```

### 1.2 Listar Roles Disponibles
```
GET /api/v1/users/roles
```

**Respuesta:**
```json
[
  { "id": "uuid", "name": "Admin", "description": "Administrador del sistema" },
  { "id": "uuid", "name": "Requester", "description": "Solicitante" },
  { "id": "uuid", "name": "Technical Approver", "description": "Aprobador técnico" },
  { "id": "uuid", "name": "Financial Approver", "description": "Aprobador financiero" },
  { "id": "uuid", "name": "maintenance_planner", "description": "Planificador mantención" },
  { "id": "uuid", "name": "maintenance_chief", "description": "Jefe mantención" },
  { "id": "uuid", "name": "purchasing", "description": "Compras" },
  { "id": "uuid", "name": "finance", "description": "Finanzas" }
]
```

### 1.3 Modificar Usuario
```
PUT /api/v1/users/{id}
```
- Puede cambiar: nombre, email, rol, estado activo
- No puede cambiar: contraseña ajena (el usuario cambia la suya vía `/users/me`)

### 1.4 Desactivar/Eliminar Usuario
```
DELETE /api/v1/users/{id}
```
- Realiza **soft delete** (marca `is_deleted=true`, `deleted_at=timestamp`)
- El usuario no puede volver a iniciar sesión
- Sus solicitudes y registros históricos se mantienen

---

## 2. Gestión de Organizaciones

### 2.1 Crear Empresa

**Endpoint:** `POST /api/v1/organizations/companies`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `name` | string | ✅ | Nombre de la empresa (único) |
| `tax_id` | string | ✅ | RUT o identificador fiscal (único) |

### 2.2 Crear Centro de Costo

**Endpoint:** `POST /api/v1/organizations/cost-centers`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `name` | string | ✅ | Nombre del centro de costo |
| `code` | string | ✅ | Código (ej: IT-001, OPS-002) |
| `company_id` | UUID | ✅ | Empresa a la que pertenece |

### 2.3 Relación Empresa → Centro de Costo → Presupuesto

```
Empresa (Company)
  └── Centro de Costo (CostCenter)
        └── Presupuesto Anual (Budget)
              ├── total_amount: Monto asignado
              ├── reserved_amount: En proceso
              ├── executed_amount: Completado
              └── available_amount: Disponible
```

---

## 3. Matriz de Aprobación

### 3.1 Concepto
La matriz de aprobación define **quién debe aprobar qué**, basado en:
- **Empresa** (opcional, null = aplica a todas)
- **Centro de costo** (opcional, null = aplica a todos)
- **Rango de monto** (min_amount - max_amount)
- **Rol aprobador** (qué rol debe aprobar)
- **Orden del paso** (step_order: 1, 2, 3...)

### 3.2 Crear Regla de Aprobación

**Endpoint:** `POST /api/v1/approval-matrix/`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|:-----------:|-------------|
| `company_id` | UUID | ❌ | Empresa (null = todas) |
| `cost_center_id` | UUID | ❌ | Centro de costo (null = todos) |
| `min_amount` | decimal | ✅ | Monto mínimo para activar la regla |
| `max_amount` | decimal | ✅ | Monto máximo (usar valor alto para "sin límite") |
| `role_id` | UUID | ✅ | Rol que debe aprobar |
| `step_order` | int | ✅ | Orden de aprobación (1 = primero, 2 = segundo, etc.) |

### 3.3 Configuración por Defecto (Seed Data)

| Regla | Monto | Aprobador | Paso |
|-------|-------|-----------|------|
| Regla 1 | $0 - $999,999,999 | Aprobador Técnico | 1 |
| Regla 2 | $1,000 - $999,999,999 | Aprobador Financiero | 2 |

**Efecto:**
- Solicitudes ≤ $1,000: Solo requieren aprobación técnica (1 paso)
- Solicitudes > $1,000: Requieren aprobación técnica + financiera (2 pasos)

### 3.4 Ejemplos de Configuración Personalizada

**Ejemplo 1: Solo aprobación financiera para montos altos**
```json
{
  "min_amount": 5000,
  "max_amount": 999999999,
  "role_id": "uuid-financial-approver",
  "step_order": 1
}
```

**Ejemplo 2: Triple aprobación para una empresa específica**
```json
// Paso 1: Técnico
{ "company_id": "uuid-empresa-X", "min_amount": 0, "max_amount": 999999999, "role_id": "uuid-tech", "step_order": 1 }
// Paso 2: Financiero
{ "company_id": "uuid-empresa-X", "min_amount": 0, "max_amount": 999999999, "role_id": "uuid-fin", "step_order": 2 }
// Paso 3: Gerente (si existiera el rol)
{ "company_id": "uuid-empresa-X", "min_amount": 10000, "max_amount": 999999999, "role_id": "uuid-gerente", "step_order": 3 }
```

---

## 4. Auditoría

### 4.1 Consultar Logs de Auditoría

**Endpoint:** `GET /api/v1/audit/logs`  
**Acceso:** Solo Admin

### Filtros Disponibles

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `date_from` | datetime | Fecha inicio |
| `date_to` | datetime | Fecha fin |
| `action` | string | Tipo de acción (SUBMITTED, APPROVED, REJECTED, etc.) |
| `actor_id` | UUID | Filtrar por usuario que realizó la acción |
| `request_id` | UUID | Filtrar por solicitud |
| `skip` | int | Paginación |
| `limit` | int | Registros por página |

### Información de Cada Registro

| Campo | Descripción |
|-------|-------------|
| `actor_name` | Nombre del usuario que realizó la acción |
| `actor_role` | Rol del usuario |
| `action` | Acción realizada |
| `from_status` | Estado anterior |
| `to_status` | Estado posterior |
| `comment` | Comentario del actor |
| `ip_address` | Dirección IP del cliente |
| `timestamp` | Fecha y hora exacta |

### 4.2 Exportar Auditoría
```
GET /api/v1/audit/logs/export?format=excel
GET /api/v1/audit/logs/export?format=pdf
```

Los mismos filtros de consulta aplican a la exportación.

---

## 5. Infraestructura y Despliegue

### 5.1 Levantar el Sistema
```bash
# Levantar base de datos + API
docker-compose up --build

# Aplicar migraciones de base de datos
docker-compose exec app alembic upgrade head

# Cargar datos iniciales (roles, empresa, usuarios, equipos)
docker-compose exec app python scripts/initial_data.py
```

### 5.2 Variables de Entorno

| Variable | Valor Default | Descripción |
|----------|---------------|-------------|
| `POSTGRES_SERVER` | db | Host de PostgreSQL |
| `POSTGRES_USER` | postgres | Usuario de BD |
| `POSTGRES_PASSWORD` | password | Contraseña de BD |
| `POSTGRES_DB` | sgp_db | Nombre de la BD |
| `POSTGRES_PORT` | 5432 | Puerto de BD |
| `SECRET_KEY` | (cambiar) | Clave para firmar tokens JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 60 | Duración del token en minutos |

### 5.3 Servicios Docker

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| `app` | 8000 | API FastAPI |
| `db` | 5432 | PostgreSQL 15 |

### 5.4 Migraciones de Base de Datos

```bash
# Ver estado actual
docker-compose exec app alembic current

# Crear nueva migración
docker-compose exec app alembic revision --autogenerate -m "descripción"

# Aplicar migraciones pendientes
docker-compose exec app alembic upgrade head

# Revertir última migración
docker-compose exec app alembic downgrade -1
```

### 5.5 Monitoreo

- **Health check**: Acceder a `http://localhost:8000/docs` para verificar que la API está activa
- **Logs**: `docker-compose logs -f app` para ver logs en tiempo real
- **SLA Engine**: Se ejecuta automáticamente cada hora vía APScheduler
  - Verifica tiempos de aprobación, confirmación y recepción
  - Genera alertas cuando se exceden los SLA configurados

---

## 6. Seguridad

### 6.1 Autenticación
- Tokens JWT firmados con HS256
- Contraseñas hasheadas con bcrypt
- Tokens expiran en 60 minutos (configurable)

### 6.2 Buenas Prácticas
- **Cambiar `SECRET_KEY`** en producción (valor por defecto es inseguro)
- Usar **HTTPS** en producción (configurar reverse proxy)
- Rotar contraseñas de usuarios periódicamente
- Revisar logs de auditoría regularmente
- No compartir tokens entre usuarios

### 6.3 Soft Delete
- Los registros nunca se eliminan físicamente de la base de datos
- Se marcan con `is_deleted=true` y `deleted_at=timestamp`
- Las consultas por defecto filtran registros eliminados
- Esto permite auditoría histórica completa

### 6.4 Registro de IP
- Todas las acciones de workflow registran la IP del cliente
- Compatible con headers `X-Forwarded-For` para proxies
- Almacenado en `WorkflowLog.ip_address`
