# Manual de Usuario - SGP Sistema de Gestión de Pedidos

## Índice

1. [Introducción](#1-introducción)
2. [Acceso al Sistema](#2-acceso-al-sistema)
3. [Roles del Sistema](#3-roles-del-sistema)
4. [Módulo de Solicitudes de Pedido](#4-módulo-de-solicitudes-de-pedido)
5. [Módulo de Mantención](#5-módulo-de-mantención)
6. [Módulo de Presupuesto](#6-módulo-de-presupuesto)
7. [Dashboard y Reportes](#7-dashboard-y-reportes)
8. [Preguntas Frecuentes](#8-preguntas-frecuentes)

---

## 1. Introducción

El **SGP (Sistema de Gestión de Pedidos)** es una plataforma para gestionar el ciclo completo de solicitudes de compra y mantención de equipos. El sistema asegura trazabilidad completa, control presupuestario y flujos de aprobación configurables.

### Objetivos del Sistema
- Centralizar las solicitudes de compra con trazabilidad de punta a punta
- Automatizar flujos de aprobación técnica y financiera
- Controlar presupuesto por centro de costo
- Gestionar mantenciones de equipos pesados con documentación completa
- Proveer auditoría completa de todas las acciones

### URL de Acceso
- **API**: `http://localhost:8000/api/v1/`
- **Documentación Swagger**: `http://localhost:8000/docs`
- **Documentación ReDoc**: `http://localhost:8000/redoc`

---

## 2. Acceso al Sistema

### 2.1 Inicio de Sesión

| Campo | Descripción |
|-------|-------------|
| **Endpoint** | `POST /api/v1/login/access-token` |
| **Entrada** | `username` (email) + `password` |
| **Salida** | Token JWT (válido por 60 minutos) |

**Ejemplo de petición:**
```json
POST /api/v1/login/access-token
Content-Type: application/x-www-form-urlencoded

username=requester@example.com&password=password
```

**Respuesta exitosa:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 2.2 Uso del Token

Incluir en todas las peticiones posteriores:
```
Authorization: Bearer <access_token>
```

### 2.3 Usuarios de Prueba

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@example.com | password | Administrador |
| requester@example.com | password | Solicitante |
| tech@example.com | password | Aprobador Técnico |
| financial@example.com | password | Aprobador Financiero |
| planner@example.com | password | Planificador Mantención |
| chief@example.com | password | Jefe Mantención |
| purchasing@example.com | password | Compras |
| finance@example.com | password | Finanzas |

---

## 3. Roles del Sistema

> Documentación detallada en: [21_ROLES_Y_PERMISOS.md](21_ROLES_Y_PERMISOS.md)

### Resumen de Roles

| Rol | Función Principal |
|-----|-------------------|
| **Admin** | Administración total del sistema |
| **Solicitante (Requester)** | Crea y gestiona solicitudes de compra |
| **Aprobador Técnico** | Valida especificaciones técnicas |
| **Aprobador Financiero** | Valida montos y presupuesto |
| **Planificador Mantención** | Planifica y crea solicitudes de mantención |
| **Jefe Mantención** | Aprueba solicitudes de mantención |
| **Compras (Purchasing)** | Genera órdenes de compra |
| **Finanzas (Finance)** | Procesa pagos y cierre financiero |

---

## 4. Módulo de Solicitudes de Pedido

> Procedimiento detallado en: [22_PROCEDIMIENTO_SOLICITUDES.md](22_PROCEDIMIENTO_SOLICITUDES.md)

### Ciclo de Vida de una Solicitud

```
BORRADOR ──enviar──> PEND. TÉCNICA ──aprobar──> PEND. FINANCIERA ──aprobar──> APROBADA
    │                     │                           │
    └──cancelar──> CANCELADA  └──rechazar──> RECHAZADA <──rechazar──┘

APROBADA ──> EN COMPRA ──> RECEPCIÓN PARCIAL/TOTAL ──> COMPLETADA
```

### Resumen Rápido

| Paso | Quién | Acción | Estado Resultante |
|------|-------|--------|-------------------|
| 1 | Solicitante | Crea solicitud | DRAFT |
| 2 | Solicitante | Envía a aprobación | PENDING_TECHNICAL |
| 3 | Aprobador Técnico | Aprueba | PENDING_FINANCIAL (si monto > $1000) |
| 4 | Aprobador Financiero | Aprueba | APPROVED |
| 5 | Compras | Gestiona compra | PURCHASING |
| 6 | Solicitante/Compras | Recepciona bienes | RECEIVED_FULL / COMPLETED |

---

## 5. Módulo de Mantención

> Procedimiento detallado en: [23_PROCEDIMIENTO_MANTENCION.md](23_PROCEDIMIENTO_MANTENCION.md)

### Ciclo de Vida de una Solicitud de Mantención (SM)

```
BORRADOR ──enviar──> PEND. APROBACIÓN ──aprobar──> APROBADA ──cotizar──> COTIZACIÓN PENDIENTE
    │                     │
    └──cancelar          └──rechazar

──> ESPERANDO PRERREQUISITOS ──gate ok──> LISTA PARA EJECUCIÓN
──> EN TRÁNSITO ──> EN MANTENCIÓN ──> PEND. RECEPCIÓN
──> PEND. CERTIFICADO ──> EN TRÁNSITO RETORNO ──> COMPLETADA
──> PEND. D5 ──> LISTA FACTURACIÓN ──> PEND. PAGO ──> CERRADA
```

### Documentos del Flujo (D1-D7)

| Doc | Nombre | Momento |
|-----|--------|---------|
| D1 | Orden de Compra (OC) | Auto-generada al aprobar SM |
| D2 | Cotización | Proveedor entrega cotización |
| D3 | Confirmación Proveedor | Proveedor confirma disponibilidad |
| D4 | Programación Transporte | Cama baja programada |
| D5 | Cierre Operativo | Documento de término firmado |
| D6 | Certificado Mantención | Evidencia técnica |
| D7 | Factura / Pago | Cierre financiero |

---

## 6. Módulo de Presupuesto

### Consulta de Presupuesto

| Campo | Descripción |
|-------|-------------|
| **Endpoint** | `GET /api/v1/budgets/{cost_center_id}` |
| **Acceso** | Todos los usuarios autenticados |

**Respuesta:**
```json
{
  "id": "uuid",
  "cost_center_id": "uuid",
  "year": 2024,
  "total_amount": 10000.00,
  "reserved_amount": 1500.00,
  "executed_amount": 3000.00,
  "available_amount": 5500.00
}
```

### Cálculo de Disponibilidad
```
Disponible = Total - Reservado - Ejecutado
```

| Concepto | Descripción |
|----------|-------------|
| **Total** | Presupuesto asignado al centro de costo para el año |
| **Reservado** | Solicitudes en proceso (enviadas, pendientes de aprobación) |
| **Ejecutado** | Solicitudes completadas y recepcionadas |
| **Disponible** | Fondos libres para nuevas solicitudes |

> **Nota**: El presupuesto es referencial. Las solicitudes pueden enviarse aunque excedan el presupuesto disponible.

### Reportes de Presupuesto

| Endpoint | Descripción | Formatos |
|----------|-------------|----------|
| `GET /api/v1/budgets/report` | Reporte agrupado por empresa/CC | JSON |
| `GET /api/v1/budgets/report/export?format=excel` | Exportar reporte | Excel, PDF |

---

## 7. Dashboard y Reportes

### 7.1 Dashboard Consolidado

| Campo | Descripción |
|-------|-------------|
| **Endpoint** | `GET /api/v1/dashboard/summary` |
| **Acceso** | Todos los usuarios autenticados |

**Información incluida:**
- Distribución de solicitudes por estado
- Acciones pendientes (filtrado por rol del usuario)
- Últimas 5 solicitudes
- Resumen de presupuesto por centro de costo

### 7.2 Exportación de Datos

| Recurso | Endpoint | Formatos |
|---------|----------|----------|
| Solicitudes | `GET /api/v1/requests/export?format=excel` | Excel, PDF |
| Presupuesto | `GET /api/v1/budgets/report/export?format=pdf` | Excel, PDF |
| Auditoría | `GET /api/v1/audit/logs/export?format=excel` | Excel, PDF |
| Mantenciones | `GET /api/v1/maintenance/requests/export?format=excel` | Excel, PDF |

### 7.3 Auditoría (Solo Admin)

| Campo | Descripción |
|-------|-------------|
| **Endpoint** | `GET /api/v1/audit/logs` |
| **Filtros** | Fecha, tipo de acción, actor, solicitud |

Cada registro incluye: usuario, acción, estados anterior/posterior, comentario, dirección IP y timestamp.

---

## 8. Preguntas Frecuentes

### ¿Qué pasa si mi solicitud es rechazada?
La solicitud vuelve a estado REJECTED. Puedes corregirla y reenviarla (resubmit), lo que la devuelve a DRAFT para comenzar el flujo nuevamente.

### ¿Puedo editar una solicitud ya enviada?
No. Solo las solicitudes en estado DRAFT pueden ser modificadas. Si necesitas cambios, debes solicitar el rechazo al aprobador actual.

### ¿Qué pasa con el presupuesto si cancelo una solicitud?
Los fondos reservados se liberan automáticamente al cancelar o rechazar una solicitud.

### ¿Cómo sé quién debe aprobar mi solicitud?
Usa el endpoint de timeline (`GET /api/v1/requests/{id}/timeline`) para ver el estado actual, paso de aprobación y rol del siguiente aprobador.

### ¿Cuánto tiempo tiene un aprobador para responder?
El sistema monitorea SLAs automáticamente:
- Aprobación de SM: 16 horas
- Confirmación de proveedor: 24 horas  
- Recepción de equipos: 8 horas

Se generan alertas automáticas cuando se exceden estos tiempos.
