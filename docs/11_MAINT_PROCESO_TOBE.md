# 11. Módulo de Mantención — Proceso TO-BE

> **Versión:** 1.0  
> **Fecha:** Febrero 2026  
> **Autor:** Área de Excelencia Operacional e Innovación  
> **Dependencia:** `10_MAINT_DIAGNOSTICO_CAUSA_RAIZ.md`  

---

## 1. Restricciones de Diseño

Las siguientes restricciones fueron levantadas y condicionan directamente el diseño del proceso.

### C1: Planificación por horómetro — ciclo mensual (HABILITADOR)

| Dimensión | Detalle |
|-----------|---------|
| **Hallazgo** | Las mantenciones preventivas se planifican mes a mes basándose en horas de operación (horómetro) de cada equipo. |
| **Implicancia** | Se dispone de 2-4 semanas de anticipación desde que se identifica la necesidad hasta la fecha planificada. Esto es tiempo suficiente para completar el flujo administrativo ANTES de la ejecución. |
| **Decisión de diseño** | La SM se genera al momento de planificar (inicio del mes o al detectar umbral), NO cuando el equipo ya necesita entrar a taller. |
| **Riesgo** | Si el planificador demora en generar la SM, se pierde la ventana de anticipación. |

### C2: Recurso logístico único — 1 cama baja propia (RESTRICCIÓN CRÍTICA)

| Dimensión | Detalle |
|-----------|---------|
| **Hallazgo** | Existe 1 solo camión cama baja para trasladar equipos entre faena y taller (María Elena). Es recurso propio. |
| **Implicancia** | La cama baja es cuello de botella logístico. Si 2+ equipos necesitan mantención en la misma ventana, se secuencian. Limita capacidad total del sistema a ~2 rotaciones/semana. |
| **Decisión de diseño** | Se necesita módulo de programación de cama baja dentro del plan de mantención. |
| **Riesgo** | Sin programación formal, la cama baja se disputa por urgencias generando reprogramaciones en cascada. |

### C3: Múltiples proveedores según tipo de equipo (COMPLEJIDAD)

| Dimensión | Detalle |
|-----------|---------|
| **Hallazgo** | No hay proveedor único. Distintos equipos son mantenidos por distintos proveedores especializados. |
| **Implicancia** | Abastecimiento necesita saber con anticipación: qué proveedor, condiciones comerciales y disponibilidad. La OC no es genérica — va dirigida a un proveedor específico. |
| **Decisión de diseño** | La SM debe incluir obligatoriamente el proveedor asignado. Mantener catálogo de proveedores por tipo de equipo. |
| **Riesgo** | Si el proveedor no tiene disponibilidad, se genera reprogramación que afecta la cama baja y otros equipos. |

### C4: Checklist de recepción conforme — no existe (BRECHA)

| Dimensión | Detalle |
|-----------|---------|
| **Hallazgo** | No existe ningún formato de recepción conforme post-mantención. |
| **Implicancia** | Es la brecha más peligrosa operacionalmente. Sin recepción conforme: no hay evidencia de calidad, no se puede reclamar al proveedor, el certificado no tiene sustento técnico interno. |
| **Decisión de diseño** | Diseñar checklist genérico con sección configurable por tipo de equipo. Es requisito obligatorio para emitir certificado. |
| **Riesgo** | Si es demasiado complejo, se llena mecánicamente sin valor real. |

---

## 2. Actores del Proceso

### 2.1 Planificador de Mantenciones

| Dimensión | Detalle |
|-----------|---------|
| **Área** | Mantenimiento |
| **Responsabilidades** | Genera Plan de Mantención Preventiva (PMP), define fechas/equipos/tipo, coordina ventanas de disponibilidad, genera la Solicitud de Mantención (SM) en el sistema, dispara el flujo administrativo con anticipación. |
| **KPI** | % de mantenciones ejecutadas según plan. |

### 2.2 Jefe de Mantenimiento

| Dimensión | Detalle |
|-----------|---------|
| **Área** | Mantenimiento |
| **Responsabilidades** | Valida y aprueba la SM, envía requerimiento formal al proveedor, coordina logística de salida de equipo (cama baja), realiza o delega la recepción conforme técnica, firma cierre técnico. |
| **KPI** | Tiempo promedio equipo fuera de faena. |

### 2.3 Proveedor de Mantención

| Dimensión | Detalle |
|-----------|---------|
| **Área** | Externo |
| **Responsabilidades** | Recibe requerimiento formal, confirma disponibilidad y agenda, envía mecánicos a taller (María Elena), ejecuta mantención, emite certificado (post OC + recepción conforme), genera factura contra OC. |
| **KPI** | Cumplimiento de SLA de servicio. |

### 2.4 Abastecimiento

| Dimensión | Detalle |
|-----------|---------|
| **Área** | Abastecimiento |
| **Responsabilidades** | Recibe solicitud de compra aprobada, genera OC, vincula OC a SM, envía OC al proveedor, gestiona cierre administrativo. |
| **KPI** | Tiempo de generación de OC (SLA: 3 días hábiles). |

### 2.5 Finanzas

| Dimensión | Detalle |
|-----------|---------|
| **Área** | Finanzas |
| **Responsabilidades** | Valida presupuesto disponible por centro de costo, aprueba solicitudes según rango de monto, registra factura contra OC, controla ejecución presupuestaria de mantención. |
| **KPI** | Desviación presupuestaria mantención. |

---

## 3. Proceso TO-BE — Flujo Detallado

### Paso 1: Detección de umbral + Generación de SM

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | DISPARO |
| **Owner** | Planificador de Mantenciones |
| **Trigger** | Horómetro alcanza umbral programado O inicio de ciclo mensual de planificación. |
| **Precondiciones** | Plan de mantención preventiva vigente con umbrales definidos por equipo. |
| **Acciones** | 1. Revisa horómetros de todos los equipos del plan mensual. 2. Genera SM en sistema: equipo, tipo de mantención, proveedor sugerido, costo estimado, fecha planificada. 3. Sistema asigna número correlativo: `SM-YYYY-NNNN`. 4. Notificación automática a Jefe de Mantenimiento. |
| **Outputs** | SM en estado `PENDIENTE_APROBACION`. |
| **SLA** | Máx. 2 días hábiles desde detección de umbral. |

### Paso 2: Validación técnica y aprobación (PUNTO DE BIFURCACIÓN)

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | APROBACIÓN |
| **Owner** | Jefe de Mantenimiento |
| **Trigger** | SM creada y en bandeja de aprobación. |
| **Acciones** | 1. Revisa alcance técnico. 2. Confirma o modifica proveedor. 3. Valida fecha planificada considerando operación. 4. Aprueba SM → **PUNTO DE BIFURCACIÓN**. |
| **Outputs** | SM en estado `APROBADA`. Solicitud de compra generada automáticamente → Abastecimiento. Requerimiento formal generado → Proveedor. Evento de coordinación logística disparado. |
| **SLA** | Máx. 2 días hábiles. |
| **GATE** | Al aprobar, se disparan 3 flujos en **PARALELO**: Administrativo (OC), Proveedor (confirmación), Logístico (cama baja). |

### Paso 3A: Generación de OC (Flujo paralelo — Administrativo)

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | PARALELO — ADMINISTRATIVO |
| **Owner** | Abastecimiento |
| **Trigger** | Solicitud de compra generada desde SM aprobada. |
| **Acciones** | 1. Recibe solicitud con proveedor, monto estimado y alcance. 2. Genera OC vinculada a SM (relación trazable). 3. Envía OC al proveedor. 4. Registra confirmación de recepción del proveedor. |
| **Outputs** | OC generada, enviada y confirmada por proveedor. |
| **SLA** | Máx. 3 días hábiles — CON ESCALAMIENTO AUTOMÁTICO (día 2: warning; día 3: alerta jefatura; día 4: escalamiento gerencia). |

### Paso 3B: Confirmación de disponibilidad (Flujo paralelo — Proveedor)

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | PARALELO — PROVEEDOR |
| **Owner** | Proveedor |
| **Trigger** | Requerimiento formal recibido del Jefe de Mantenimiento. |
| **Acciones** | 1. Revisa disponibilidad de mecánicos. 2. Confirma o propone fecha alternativa. 3. Confirma alcance del servicio. |
| **Outputs** | Disponibilidad confirmada con fecha y alcance. |
| **SLA** | Máx. 3 días hábiles. |

### Paso 3C: Programación de cama baja (Flujo paralelo — Logístico)

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | PARALELO — LOGÍSTICO |
| **Owner** | Jefe de Mantenimiento |
| **Trigger** | SM aprobada + fecha planificada definida. |
| **Acciones** | 1. Verifica disponibilidad de cama baja. 2. Si conflicto → prioriza por criticidad o reprograma. 3. Programa viaje ida (faena → taller). 4. Pre-programa viaje vuelta. 5. Notifica a Operaciones la indisponibilidad del equipo. |
| **Outputs** | Cama baja programada. Operaciones notificada. |
| **SLA** | Programar con mín. 5 días hábiles de anticipación. |

### Paso 4: Verificación pre-ejecución (GATE DE CONTROL)

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | GATE DE CONTROL |
| **Owner** | Sistema / Jefe de Mantenimiento |
| **Acciones** | 1. VERIFICAR: ¿OC generada y confirmada por proveedor? ✓ 2. VERIFICAR: ¿Proveedor confirmó disponibilidad? ✓ 3. VERIFICAR: ¿Cama baja programada? ✓ 4. Si las 3 se cumplen → HABILITA ejecución. 5. Si alguna falla → BLOQUEA y notifica responsable pendiente. |
| **Outputs** | Ejecución habilitada o bloqueada con motivo registrado. |
| **SLA** | Automático — verificación en tiempo real. |
| **GATE CRÍTICO** | Sin las 3 condiciones cumplidas, el equipo NO sale de faena. Esto invierte la lógica actual. |

### Paso 5: Traslado + Mantención + Recepción

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | EJECUCIÓN |
| **Owner** | Logística + Proveedor + Jefe de Mantenimiento |
| **Trigger** | Gate de control aprobado. |
| **Acciones** | 1. Cama baja traslada equipo a taller María Elena. 2. Acta de entrega firmada (equipo → proveedor). 3. Proveedor ejecuta mantención según alcance. 4. Proveedor notifica finalización. 5. Jefe de Mantenimiento ejecuta recepción conforme con checklist. 6. Si CONFORME → firma y libera equipo. 7. Si NO CONFORME → observaciones → subsanación → nueva revisión. |
| **Outputs** | Mantención ejecutada. Recepción conforme firmada (o ciclo de subsanación). |
| **SLA** | Ejecución: según alcance definido en requerimiento. Recepción conforme: 1 día hábil post-notificación de finalización. |
| **GATE CRÍTICO** | La recepción conforme es OBLIGATORIA. Sin ella no se emite certificado ni se retorna equipo. |

### Paso 6: Certificado + Retorno + Cierre

| Dimensión | Detalle |
|-----------|---------|
| **Fase** | CIERRE |
| **Owner** | Proveedor + Logística + Finanzas |
| **Trigger** | Recepción conforme firmada + OC vigente. |
| **Acciones** | 1. Proveedor emite certificado de mantención (tiene OC + RC). 2. Certificado se carga en sistema vinculado a SM y OC. 3. Cama baja retorna equipo a faena. 4. Sistema registra equipo como `OPERATIVO_CON_CERTIFICADO`. 5. Proveedor emite factura contra OC. 6. Finanzas registra factura y cierra ciclo presupuestario. 7. Sistema cierra SM con expediente completo. |
| **Outputs** | Certificado vigente. Equipo operativo. Ciclo cerrado: SM → OC → RC → Certificado → Factura → Cierre. |
| **SLA** | Certificado: 2 días hábiles. Retorno: según disponibilidad cama baja. |
| **GATE** | Equipo NO puede marcarse como `OPERATIVO` sin certificado cargado en sistema. |

---

## 4. Definición de SLAs

| Etapa | Owner | SLA | Escalamiento |
|-------|-------|-----|-------------|
| Generación de SM | Planificador | 2 días hábiles | Alerta a Jefe de Mantenimiento |
| Aprobación de SM | Jefe de Mantenimiento | 2 días hábiles | Alerta a Gerente de Operaciones |
| Generación de OC | Abastecimiento | 3 días hábiles | Día 2: warning. Día 3: alerta jefatura. Día 4: gerencia. |
| Confirmación proveedor | Proveedor | 3 días hábiles | Jefe Mant. busca alternativo o reprograma |
| Programación cama baja | Jefe de Mantenimiento | 5 días anticipación | Priorización por criticidad de equipo |
| Ejecución mantención | Proveedor | Según alcance | Notificación + registro de incumplimiento |
| Recepción conforme | Jefe de Mantenimiento | 1 día hábil | Alerta automática |
| Emisión certificado | Proveedor | 2 días hábiles | Penalización o registro incumplimiento |

**Ciclo completo estimado:** ~15 días hábiles (3 semanas) desde detección de umbral hasta equipo en faena con certificado.

---

## 5. Comparación AS-IS vs. TO-BE

| Dimensión | AS-IS (Hoy) | TO-BE (Propuesto) |
|-----------|-------------|-------------------|
| **Secuencia** | Ejecutar → formalizar (o nunca) | Formalizar → ejecutar |
| **OC** | Post-ejecución o inexistente | Pre-ejecución obligatoria |
| **Recepción conforme** | No existe | Obligatoria con checklist |
| **Certificado** | Bloqueado por falta de OC | Fluye naturalmente (OC + RC) |
| **Tiempo total** | Impredecible (semanas a meses) | ~15 días hábiles, medible |
| **Cama baja** | Se disputa sin programación | Recurso programado con anticipación |
| **Visibilidad** | WhatsApp y correos | Sistema con estado en tiempo real |
| **Presupuesto** | Sin control hasta factura | Reserva al aprobar SM |
| **Datos** | No hay registro | Timestamp por etapa, métricas automáticas |

---

## 6. Timeline Tipo — Mantención Preventiva Estándar

### Semana 1: Planificación + Disparo
- **Lunes:** Planificador detecta umbral de horómetro.
- **Martes:** Genera SM en sistema.
- **Miércoles:** Jefe de Mantenimiento revisa y aprueba SM.
- **Jueves:** Solicitud de compra automática → Abastecimiento. Requerimiento → Proveedor.
- **Viernes:** Abastecimiento inicia gestión de OC.

### Semana 2: Administrativo + Logística (en paralelo)
- **Lunes:** Proveedor confirma disponibilidad. Abastecimiento genera OC.
- **Martes:** OC enviada y confirmada por proveedor.
- **Miércoles:** Jefe Mant. programa cama baja.
- **Jueves:** Gate de control: OC ✓ + Proveedor ✓ + Cama baja ✓
- **Viernes:** Ventana de holgura (buffer).

### Semana 3: Ejecución + Control
- **Lunes:** Cama baja traslada equipo a taller.
- **Martes-Miércoles:** Proveedor ejecuta mantención.
- **Jueves:** Proveedor termina → Recepción conforme por Jefe Mant.
- **Viernes:** Proveedor emite certificado. Cama baja retorna equipo.

### Semana 3-4: Cierre
- **Lunes:** Equipo operativo en faena con certificado.
- **Martes-Jueves:** Proveedor emite factura. Finanzas registra contra OC. Cierre formal en sistema.
