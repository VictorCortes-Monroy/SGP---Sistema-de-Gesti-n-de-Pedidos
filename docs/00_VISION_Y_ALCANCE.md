# 00. Visión y Alcance del Sistema

## 1. Introducción
**Sistema de Gestión de Solicitudes de Pedido (SGP)**

El objetivo fundamental es transformar la gestión de compras desde un proceso informal y basado en correos/chats ("grupo de WhatsApp con PDFs") a un sistema bancarizado, auditable y determinista.

### 1.1 El Problema
- **Opacidad:** Desconocimiento del estado de un pedido ("agujero negro").
- **Discrecionalidad:** Aprobaciones basadas en afinidad y no en reglas de negocio.
- **Descontrol Presupuestario:** Compras aprobadas sin fondos disponibles.
- **Falta de Trazabilidad:** Imposibilidad de auditar quién aprobó qué, cuándo y por qué.

### 1.2 Objetivo del Sistema
Gestionar el ciclo de vida completo de una solicitud de pedido:
1.  **Creación**: Ingreso estandarizado.
2.  **Aprobación**: Flujo basado en reglas (Matriz de Aprobación).
3.  **Compra**: Emisión de Orden de Compra (OC).
4.  **Cierre**: Recepción conforme de bienes/servicios.

---

## 2. Pilares del Sistema

### A. Motor de Workflow (Pipeline)
El estado de una solicitud no se cambia arbitrariamente. Sigue un camino estricto:
`Borrador -> Pendiente Técnico -> Pendiente Financiero -> Aprobado -> En Compra -> Recepción -> Finalizado`

### B. Matriz de Aprobación Dinámica
El sistema decide quién aprueba, no el usuario. La asignación se basa en:
*   **Empresa** (Scope)
*   **Centro de Costo** (Origen del gasto)
*   **Tipo de Compra** (Categoría)
*   **Monto** (Umbrales de dinero)

### C. Audit Trail Inmutable (Ledger)
Cada acción queda registrada como un asiento contable:
*   **Qué pasó**: Cambio de estado, edición, comentario.
*   **Quién**: Usuario y Rol.
*   **Cuándo**: Timestamp exacto.
*   **Regla**: Por qué se permitió la acción.

### D. Integridad
*   Adjuntos (Cotizaciones, OCs) protegidos con hash y versionado.
*   "Lo que no está en el sistema, no existe".

---

## 3. Roles y Permisos (RBAC)

### Roles Base

| Rol | Responsabilidad | Acciones Clave |
| :--- | :--- | :--- |
| **Solicitante** | Generar la necesidad | - Crear/Editar (Solo Borrador/Rechazado)<br>- Enviar a aprobación<br>- Ver historial propio |
| **Aprobador** | Validar según inexperiencia | - Ver solicitudes asignadas<br>- Revisar adjuntos<br>- **Aprobar/Rechazar** (con comentario obligatorio)<br>- *No puede editar la solicitud* |
| **Compras** | Ejecutar la adquisición | - Recibir solicitudes "Aprobadas"<br>- Cotizar y adjuntar cuadros comparativos<br>- Emitir OC y cambiar a "En Compra"<br>- Adjuntar factura/guía |
| **Admin Workflow** | Configuración del motor | - Configurar Matriz de Aprobación<br>- Definir Umbrales y Rutas<br>- Gestión de Usuarios |
| **Auditor / Gerencia** | Control y Visibilidad | - Acceso de solo lectura a todo<br>- Reportes de tiempos y cuellos de botella |

### Scopes (Alcance)
Un usuario puede tener un rol, pero limitado a un contexto específico:

1.  **Empresa**: El usuario solo interactúa con datos de "Empresa A" o "Empresa B".
2.  **Centro de Costos**: Un Aprobador puede serlo solo para "Gerencia TI", no para "Recursos Humanos".
3.  **Tipo de Compra**: Un aprobador técnico puede ver solo "Hardware" y no "Servicios Legales".

---

## 4. Reglas de Oro

> **1. "Ver" no implica "Actuar"**
> Tener permiso para ver una solicitud no significa tener permiso para moverla de estado.

> **2. Asignación por Motor**
> Solo puedes actuar (Aprobar/Rechazar) si el motor de workflow te ha asignado explícitamente la etapa actual.

> **3. Todo registrado**
> Nada ocurre fuera del sistema. Si hay una aprobación por correo, no es válida hasta que se refleje en el SGP.
