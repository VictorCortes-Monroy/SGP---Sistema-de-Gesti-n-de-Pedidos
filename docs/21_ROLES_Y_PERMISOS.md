# Roles y Permisos - SGP

## Índice
1. [Matriz de Roles](#1-matriz-de-roles)
2. [Detalle por Rol](#2-detalle-por-rol)
3. [Matriz de Acceso por Endpoint](#3-matriz-de-acceso-por-endpoint)
4. [Visibilidad de Datos](#4-visibilidad-de-datos)

---

## 1. Matriz de Roles

| # | Rol | Código Sistema | Módulo Principal | Descripción |
|---|-----|---------------|------------------|-------------|
| 1 | **Administrador** | `Admin` | Todos | Gestión total del sistema, usuarios, configuración y auditoría |
| 2 | **Solicitante** | `Requester` | Solicitudes | Crea, envía y hace seguimiento de solicitudes de compra |
| 3 | **Aprobador Técnico** | `Technical Approver` | Solicitudes | Valida especificaciones técnicas de las solicitudes |
| 4 | **Aprobador Financiero** | `Financial Approver` | Solicitudes | Valida montos, presupuesto y viabilidad financiera |
| 5 | **Planificador Mantención** | `maintenance_planner` | Mantención | Planifica y crea solicitudes de mantención (SM) |
| 6 | **Jefe Mantención** | `maintenance_chief` | Mantención | Aprueba SM y supervisa ejecución de mantenciones |
| 7 | **Compras** | `purchasing` | Solicitudes + Mantención | Genera órdenes de compra (OC) y gestiona proveedores |
| 8 | **Finanzas** | `finance` | Solicitudes + Mantención | Procesa pagos, valida facturas, cierre financiero |

---

## 2. Detalle por Rol

### 2.1 Administrador (`Admin`)

**Propósito**: Configuración y supervisión completa del sistema.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Gestionar usuarios | Crear, editar, desactivar y eliminar usuarios |
| Asignar roles | Cambiar el rol de cualquier usuario |
| Configurar matriz de aprobación | Definir reglas de aprobación por empresa, CC y monto |
| Gestionar organizaciones | Crear/editar empresas y centros de costo |
| Ver auditoría | Acceso completo al log de auditoría del sistema |
| Exportar reportes | Exportar cualquier reporte en Excel o PDF |
| Ver todas las solicitudes | Acceso de lectura a todas las solicitudes del sistema |

**Restricciones:**
- No puede aprobar solicitudes (no es un rol aprobador)
- No debería crear solicitudes propias (separación de funciones)

---

### 2.2 Solicitante (`Requester`)

**Propósito**: Crear y dar seguimiento a solicitudes de compra.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Crear solicitud | Nueva solicitud en estado DRAFT con ítems y montos |
| Editar borrador | Modificar solicitudes en estado DRAFT |
| Enviar a aprobación | Cambiar de DRAFT a PENDING_TECHNICAL |
| Cancelar solicitud | Cancelar solicitudes propias en DRAFT o pendientes |
| Adjuntar documentos | Subir PDF, Word, Excel, imágenes (máx. 10MB) |
| Agregar comentarios | Comentar en sus propias solicitudes |
| Ver timeline | Consultar el estado y trazabilidad de sus solicitudes |
| Recepcionar bienes | Confirmar recepción parcial o total |

**Visibilidad**: Solo ve sus propias solicitudes.

**Flujo típico:**
```
1. Crea solicitud (DRAFT)
2. Agrega ítems con cantidades y precios
3. Adjunta documentos de respaldo
4. Envía a aprobación
5. Espera aprobaciones
6. Recepciona bienes cuando llegan
```

---

### 2.3 Aprobador Técnico (`Technical Approver`)

**Propósito**: Validar que las solicitudes cumplen con especificaciones técnicas.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Ver solicitudes pendientes | Ve solicitudes en estado PENDING_TECHNICAL |
| Aprobar técnicamente | Avanza la solicitud al siguiente paso de aprobación |
| Rechazar | Devuelve la solicitud con observaciones |
| Comentar | Agregar observaciones técnicas |

**Visibilidad**: Ve sus propias solicitudes + todas las que están en PENDING_TECHNICAL.

**Criterios de evaluación:**
- ¿Las especificaciones técnicas son correctas?
- ¿Las cantidades solicitadas son razonables?
- ¿El tipo de compra es adecuado?

**Regla de activación**: Se activa para **todas las solicitudes** (monto >= $0, paso 1).

---

### 2.4 Aprobador Financiero (`Financial Approver`)

**Propósito**: Validar viabilidad financiera y presupuestaria.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Ver solicitudes pendientes | Ve solicitudes en estado PENDING_FINANCIAL |
| Aprobar financieramente | Aprueba y avanza la solicitud a APPROVED |
| Rechazar | Devuelve la solicitud con observaciones financieras |
| Consultar presupuesto | Ver disponibilidad presupuestaria por CC |
| Comentar | Agregar observaciones financieras |

**Visibilidad**: Ve sus propias solicitudes + todas las que están en PENDING_FINANCIAL.

**Criterios de evaluación:**
- ¿Hay presupuesto disponible en el centro de costo?
- ¿El monto es razonable para el tipo de compra?
- ¿La solicitud cumple con políticas financieras?

**Regla de activación**: Se activa para solicitudes con **monto > $1,000** (paso 2).

---

### 2.5 Planificador Mantención (`maintenance_planner`)

**Propósito**: Planificar y crear solicitudes de mantención de equipos.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Crear SM | Nueva solicitud de mantención con equipo y tipo |
| Gestionar equipos | Registrar y actualizar equipos en el sistema |
| Actualizar horómetro | Registrar lecturas de horómetro de equipos |
| Gestionar proveedores | Registrar y actualizar proveedores de mantención |
| Enviar SM | Enviar SM a aprobación del Jefe Mantención |
| Confirmar proveedor | Registrar confirmación del proveedor (D3) |
| Programar transporte | Registrar programación de cama baja (D4) |
| Ver alertas SLA | Recibe alertas por SLA de confirmación proveedor (24h) |

**Alertas automáticas que recibe:**
- Proveedor no confirma en 24 horas
- Equipo próximo a mantención preventiva (< 10% intervalo)

---

### 2.6 Jefe Mantención (`maintenance_chief`)

**Propósito**: Aprobar y supervisar la ejecución de mantenciones.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Aprobar SM | Aprobar solicitudes de mantención pendientes |
| Rechazar SM | Rechazar SM con observaciones |
| Supervisar ejecución | Monitorear estado de mantenciones en curso |
| Firmar D5 | Firmar documento de cierre operativo |
| Ver alertas SLA | Recibe alertas por SLA de aprobación (16h) y recepción (8h) |

**Alertas automáticas que recibe:**
- SM pendiente de aprobación por más de 16 horas
- SM pendiente de recepción por más de 8 horas

---

### 2.7 Compras (`purchasing`)

**Propósito**: Gestionar órdenes de compra y proceso de adquisición.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Ver solicitudes aprobadas | Acceso a solicitudes en estado APPROVED |
| Generar OC | Crear orden de compra a partir de solicitud aprobada |
| Vincular OC a SM | Asociar orden de compra con solicitud de mantención |
| Gestionar proveedores | Administrar catálogo de proveedores |

---

### 2.8 Finanzas (`finance`)

**Propósito**: Cierre financiero, facturación y pagos.

**Capacidades:**
| Acción | Descripción |
|--------|-------------|
| Confirmar pagos | Registrar confirmación de pago en SM |
| Validar facturas | Verificar facturas de proveedores |
| Consultar presupuesto | Ver estado presupuestario de todos los CC |
| Exportar reportes financieros | Generar reportes de presupuesto y gastos |

---

## 3. Matriz de Acceso por Endpoint

### Solicitudes de Compra

| Endpoint | Admin | Requester | Tech Approver | Fin Approver | Purchasing | Finance |
|----------|:-----:|:---------:|:-------------:|:------------:|:----------:|:-------:|
| Crear solicitud | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Listar solicitudes | Todas | Propias | Propias + Pend.Téc | Propias + Pend.Fin | ✅ | ✅ |
| Ver detalle | ✅ | Propias | Propias + Pend.Téc | Propias + Pend.Fin | ✅ | ✅ |
| Enviar (submit) | - | Propias | - | - | - | - |
| Aprobar | - | - | Paso 1 | Paso 2 | - | - |
| Rechazar | - | - | ✅ | ✅ | - | - |
| Recepcionar | - | ✅ | - | - | ✅ | - |
| Cancelar | - | Propias | - | - | - | - |
| Exportar | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Administración

| Endpoint | Admin | Requester | Tech Approver | Fin Approver | Otros |
|----------|:-----:|:---------:|:-------------:|:------------:|:-----:|
| CRUD Usuarios | ✅ | - | - | - | - |
| CRUD Empresas | ✅ | - | - | - | - |
| CRUD Centros Costo | ✅ | - | - | - | - |
| Matriz Aprobación | ✅ | - | - | - | - |
| Logs Auditoría | ✅ | - | - | - | - |

### Mantención

| Endpoint | Admin | Planner | Chief | Purchasing | Finance |
|----------|:-----:|:-------:|:-----:|:----------:|:-------:|
| Crear SM | ✅ | ✅ | ✅ | - | - |
| Aprobar SM | - | - | ✅ | - | - |
| Confirmar proveedor | - | ✅ | ✅ | - | - |
| Programar transporte | - | ✅ | ✅ | - | - |
| Vincular OC | - | - | - | ✅ | - |
| Confirmar pago | - | - | - | - | ✅ |
| Gestionar equipos | ✅ | ✅ | ✅ | - | - |
| Gestionar proveedores | ✅ | ✅ | - | ✅ | - |

---

## 4. Visibilidad de Datos

### Reglas de Visibilidad por Rol

```
┌─────────────────────┐
│   ADMINISTRADOR     │ ──→ Ve TODO el sistema
└─────────────────────┘

┌─────────────────────┐
│   SOLICITANTE       │ ──→ Solo sus propias solicitudes
└─────────────────────┘

┌─────────────────────┐
│  APROBADOR TÉCNICO  │ ──→ Sus solicitudes + PENDING_TECHNICAL
└─────────────────────┘

┌─────────────────────┐
│ APROBADOR FINANCIERO│ ──→ Sus solicitudes + PENDING_FINANCIAL
└─────────────────────┘

┌─────────────────────┐
│ ROLES MANTENCIÓN    │ ──→ Todas las SM + equipos asignados
└─────────────────────┘
```

### Presupuesto
- Todos los usuarios autenticados pueden consultar presupuesto
- Solo Admin puede modificar asignaciones presupuestarias
- El presupuesto es **referencial** (no bloquea solicitudes)

### Auditoría
- Solo el rol Admin tiene acceso al módulo de auditoría
- Cada acción del sistema queda registrada con: usuario, IP, timestamp, acción y estados
