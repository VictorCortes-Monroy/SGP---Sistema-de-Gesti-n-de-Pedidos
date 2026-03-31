# 10. Módulo de Mantención — Diagnóstico y Análisis Causa Raíz

> **Versión:** 1.0  
> **Fecha:** Febrero 2026  
> **Autor:** Área de Excelencia Operacional e Innovación  
> **Estado:** En desarrollo  

---

## 1. Contexto

El sistema SGP actualmente cubre el ciclo de vida de solicitudes de compra genéricas. Sin embargo, el proceso de **mantención preventiva** tiene un flujo propio que involucra áreas adicionales (Mantenimiento, Logística, Proveedores externos) y genera uno de los mayores impactos financieros y operacionales de la organización.

Este documento formaliza el diagnóstico del proceso actual de mantención preventiva utilizando metodologías de ingeniería de procesos: identificación de síntomas, análisis 5 Porqués, análisis causa raíz e Ishikawa.

---

## 2. Principio Rector del Diagnóstico

> **"El flujo documental debe ir ADELANTE o EN PARALELO al flujo físico, nunca detrás."**

Este principio resume el hallazgo central: hoy la mantención se ejecuta primero y la formalización administrativa ocurre después (o nunca). El proceso opera invertido.

---

## 3. Síntomas Identificados

Los síntomas son las manifestaciones observables del problema — lo que las personas ven y experimentan día a día. **Un síntoma NO es la causa.**

### S1: Certificados de mantención no se emiten o llegan con gran demora

| Dimensión | Detalle |
|-----------|---------|
| **Observable** | Los equipos operan sin certificado vigente. El proveedor retiene el documento hasta recibir la OC. |
| **Impacto** | Riesgo regulatorio, imposibilidad de demostrar cumplimiento de mantención, equipos sin respaldo técnico formal. |
| **Frecuencia** | Recurrente — ocurre en la mayoría de las mantenciones. |
| **Severidad** | CRÍTICO |

### S2: No existe validación técnica post-mantención (recepción conforme)

| Dimensión | Detalle |
|-----------|---------|
| **Observable** | El equipo retorna a faena sin que nadie verifique formalmente si la mantención se realizó correctamente. |
| **Impacto** | Riesgo de falla en operación, cero evidencia de calidad del servicio, imposible reclamar al proveedor por trabajos deficientes. |
| **Frecuencia** | Sistemático — no existe el paso en ningún caso. |
| **Severidad** | ALTO |

### S3: Equipos fuera de faena más tiempo del necesario

| Dimensión | Detalle |
|-----------|---------|
| **Observable** | Los equipos pasan días o semanas en taller esperando resolución de temas administrativos o de coordinación. |
| **Impacto** | Pérdida directa de horas productivas, impacto en continuidad operacional, costos de arriendo de equipos de reemplazo. |
| **Frecuencia** | Frecuente — agravado cuando hay demoras administrativas. |
| **Severidad** | ALTO |

### S4: El proceso se ejecuta "al revés" — primero se hace, después se formaliza

| Dimensión | Detalle |
|-----------|---------|
| **Observable** | La mantención se ejecuta antes de tener OC, sin solicitud formal aprobada. La documentación se regulariza después (si es que se hace). |
| **Impacto** | Riesgo financiero (compromisos sin respaldo), riesgo de auditoría, imposibilidad de control presupuestario real. |
| **Frecuencia** | Estructural — es la norma, no la excepción. |
| **Severidad** | CRÍTICO |

### S5: Imposibilidad de planificar correctamente la operación

| Dimensión | Detalle |
|-----------|---------|
| **Observable** | Aunque las mantenciones son programadas, las demoras y descoordinación hacen imposible predecir cuándo un equipo estará disponible. |
| **Impacto** | Planificación operacional poco confiable, sobreasignación o subasignación de equipos, incumplimiento de programas de producción. |
| **Frecuencia** | Constante — la planificación es un ejercicio teórico. |
| **Severidad** | ALTO |

### S6: Sin capacidad de control presupuestario en mantención

| Dimensión | Detalle |
|-----------|---------|
| **Observable** | No se sabe cuánto se ha gastado en mantención por equipo, por tipo de servicio, ni por período hasta que llegan las facturas (a veces meses después). |
| **Impacto** | Presupuestos de mantención descontrolados, sorpresas financieras a fin de período, imposibilidad de negociar con proveedores con datos. |
| **Frecuencia** | Permanente — no hay visibilidad financiera en tiempo real. |
| **Severidad** | MEDIO |

---

## 4. Análisis 5 Porqués

### 4.1 S1 → ¿Por qué no se emiten los certificados?

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué no se emiten los certificados? | Porque el proveedor no emite certificado sin tener una OC vigente. Es su política y es razonable. |
| 2 | ¿Por qué no hay OC cuando se ejecuta la mantención? | Porque la OC no está generada al momento en que el proveedor ya está ejecutando el servicio. |
| 3 | ¿Por qué abastecimiento no genera la OC a tiempo? | Porque abastecimiento recibe la solicitud reactivamente, muchas veces cuando la mantención ya está en curso o terminada. |
| 4 | ¿Por qué abastecimiento no tiene visibilidad anticipada? | Porque no existe un flujo formal que conecte la planificación de mantención con el proceso de compras. |
| **5** | **¿Por qué mantención y compras operan desconectados?** | **Porque el proceso nunca fue diseñado como un sistema integrado. Cada área desarrolló sus prácticas de forma independiente.** |

**→ Causa Raíz: RC1**

### 4.2 S2 → ¿Por qué no hay recepción conforme?

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué no se valida técnicamente la mantención? | Porque no existe un paso formal de recepción conforme dentro del proceso. |
| 2 | ¿Por qué no existe ese paso? | Porque el proceso nunca fue diseñado formalmente con etapas de control de calidad. |
| 3 | ¿Por qué se armó sin controles? | Porque el foco histórico ha sido "que se haga la mantención lo más rápido posible". |
| 4 | ¿Por qué se prioriza velocidad sobre control? | Porque la presión operacional por disponibilidad de equipos domina las decisiones. |
| **5** | **¿Por qué la verificación se percibe como costo y no como control?** | **Porque no existe gobernanza de proceso que defina controles mínimos obligatorios, ni métricas que visibilicen el costo de NO verificar.** |

**→ Causa Raíz: RC2**

### 4.3 S3 → ¿Por qué los equipos están fuera de faena más de lo necesario?

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué están fuera más de lo necesario? | Porque el tiempo total incluye esperas por coordinación, OC y definiciones entre áreas. |
| 2 | ¿Por qué hay tantas esperas? | Porque cada área trabaja en su propio timing sin visibilidad del estado general. |
| 3 | ¿Por qué no hay visibilidad entre áreas? | Porque no existe un sistema que muestre el estado de cada etapa en tiempo real. |
| 4 | ¿Por qué la comunicación es informal? | Porque no hay un proceso formal con etapas definidas, responsables y SLAs. |
| **5** | **¿Por qué no existen etapas formales con SLAs?** | **Porque el proceso nunca fue diseñado como flujo end-to-end con ownership claro.** |

**→ Causa Raíz: RC1**

### 4.4 S4 → ¿Por qué el proceso se ejecuta "al revés"?

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué la mantención se ejecuta antes del respaldo? | Porque la urgencia operacional fuerza a actuar aunque el proceso administrativo no esté completo. |
| 2 | ¿Por qué la urgencia puede saltarse el control? | Porque no existen gates (puntos de verificación) que impidan avanzar sin requisitos cumplidos. |
| 3 | ¿Por qué no existen gates? | Porque el proceso no tiene reglas formales de bloqueo y habilitación. |
| 4 | ¿Por qué las decisiones son discrecionales? | Porque no existe un diseño de proceso con reglas deterministas para cada transición. |
| **5** | **¿Por qué no hay reglas deterministas?** | **Porque el proceso nunca fue formalizado como un sistema con lógica de negocio explícita. Opera como prácticas informales.** |

**→ Causa Raíz: RC3**

### 4.5 S5 → ¿Por qué no se puede planificar correctamente?

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué no se puede planificar? | Porque los tiempos reales son impredecibles; lo planificado en X días toma 2X o 3X. |
| 2 | ¿Por qué los tiempos son impredecibles? | Porque no se tiene información histórica confiable de duración por tipo de mantención. |
| 3 | ¿Por qué no hay datos históricos? | Porque el proceso no registra timestamps por etapa ni cierra formalmente con métricas. |
| 4 | ¿Por qué no se registran datos? | Porque no hay un sistema que capture transiciones del proceso de forma estructurada. |
| **5** | **¿Por qué no hay sistema de registro?** | **Porque nunca se implementó una herramienta ni un proceso que exija registro formal de cada etapa.** |

**→ Causa Raíz: RC4**

### 4.6 S6 → ¿Por qué no hay control presupuestario en mantención?

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Por qué no hay control presupuestario? | Porque las OC se generan post-ejecución (o no se generan), y el compromiso financiero no se registra al momento correcto. |
| 2 | ¿Por qué el compromiso no se registra a tiempo? | Porque el flujo administrativo está desconectado del flujo operacional. |
| 3 | ¿Por qué están desconectados? | Porque no existe un evento de proceso que vincule la decisión de mantener con la solicitud de compra. |
| 4 | ¿Por qué no existe esa vinculación? | Porque mantención y finanzas/abastecimiento no comparten un proceso común. |
| **5** | **¿Por qué operan en mundos paralelos?** | **Porque no existe un diseño integrado que trate la mantención como evento con dimensión técnica Y financiera simultáneamente.** |

**→ Causa Raíz: RC1**

---

## 5. Causas Raíz Identificadas

### RC1: Ausencia de proceso integrado end-to-end

| Dimensión | Detalle |
|-----------|---------|
| **Categoría** | PROCESO |
| **Descripción** | El proceso de mantención y el proceso de compras evolucionaron de forma independiente. No existe un flujo que los vincule como un proceso único con etapas, responsables y transiciones definidas. |
| **Síntomas que explica** | S1, S3, S6 |
| **Impacto** | Es la causa raíz más transversal. Genera la mayoría de los cuellos de botella. |
| **Intervención** | Diseñar e implementar un proceso integrado que vincule la Solicitud de Mantención con la Solicitud de Compra como un flujo único con bifurcación paralela. |

### RC2: Ausencia de gobernanza y controles de calidad

| Dimensión | Detalle |
|-----------|---------|
| **Categoría** | GOBIERNO |
| **Descripción** | No existe owner de proceso ni controles de calidad mínimos (como la recepción conforme). La presión operacional ha normalizado operar sin verificaciones. |
| **Síntomas que explica** | S2 |
| **Impacto** | Riesgo operacional directo: equipos vuelven a faena sin garantía de mantención correcta. |
| **Intervención** | Definir controles obligatorios (recepción conforme con checklist técnico) y asignar ownership del proceso completo. |

### RC3: Ausencia de reglas deterministas y gates de control

| Dimensión | Detalle |
|-----------|---------|
| **Categoría** | REGLAS |
| **Descripción** | Las decisiones de avanzar de etapa son discrecionales. No existen condiciones formales que deban cumplirse para continuar (gates). Esto permite que el flujo físico avance sin el flujo documental. |
| **Síntomas que explica** | S4 |
| **Impacto** | Es la causa del "proceso invertido". Sin gates, la urgencia siempre gana al control. |
| **Intervención** | Implementar gates: no se entrega equipo sin OC confirmada, no se emite certificado sin recepción conforme, no se marca equipo operativo sin certificado. |

### RC4: Ausencia de sistema de registro y datos del proceso

| Dimensión | Detalle |
|-----------|---------|
| **Categoría** | DATOS |
| **Descripción** | No existe un sistema que capture transiciones del proceso con timestamps y responsables. No hay datos para medir, predecir ni optimizar. |
| **Síntomas que explica** | S5 |
| **Impacto** | Sin datos, no hay mejora continua posible. La planificación es teórica. |
| **Intervención** | Implementar registro de cada transición con timestamp, responsable y estado. Generar métricas automáticas de tiempos de ciclo. |

---

## 6. Mapa de Convergencia

```
SÍNTOMAS                          CAUSAS RAÍZ
────────                          ───────────
S1 (Certificados) ──────────┐
S3 (Tiempo fuera faena) ────┼──→ RC1: Proceso no integrado (PROCESO)
S6 (Sin control presup.) ───┘
                                  
S2 (Sin recepción conforme) ───→ RC2: Sin gobernanza (GOBIERNO)
                                  
S4 (Proceso invertido) ────────→ RC3: Sin gates de control (REGLAS)
                                  
S5 (Planificación fallida) ────→ RC4: Sin datos del proceso (DATOS)
```

**Hallazgo clave:** 6 síntomas convergen en solo 4 causas raíz. Intervenciones focalizadas en estas 4 causas resuelven múltiples síntomas simultáneamente.

---

## 7. Prioridad de Intervención

| Prioridad | Causa Raíz | Justificación |
|-----------|-----------|---------------|
| **#1 MÁXIMA** | RC1 — Proceso integrado | Resuelve 3 síntomas (S1, S3, S6). Es la más transversal y habilita las demás. |
| **#2 ALTA** | RC3 — Gates de control | Resuelve S4 (proceso invertido). Sin gates, la urgencia siempre vence al control. |
| **#3 ALTA** | RC2 — Gobernanza y calidad | Resuelve S2 (sin recepción conforme). Cierra la brecha de calidad técnica. |
| **#4 IMPORTANTE** | RC4 — Sistema de datos | Resuelve S5 (planificación). Necesita RC1 implementado primero. |

---

## 8. Diagrama de Ishikawa

**Efecto central:** *Proceso de mantención preventiva sin control, sin trazabilidad y sin cierre formal.*

### 8.1 Método (Diseño de Proceso)
- No existe proceso formal de mantención end-to-end
- Flujo administrativo desconectado del flujo operacional
- Sin etapas de control de calidad definidas
- Sin gates de bloqueo entre etapas
- Proceso secuencial donde debería ser paralelo

### 8.2 Personas
- No hay owner de proceso definido
- Cada área optimiza su parte sin visión global
- Decisiones discrecionales por urgencia operacional
- Resistencia a "agregar pasos" al proceso
- Cultura de resolver en el momento vs. planificar

### 8.3 Tecnología / Sistema
- Sin sistema que vincule mantención con compras
- Sin registro estructurado de transiciones de proceso
- Comunicación por canales informales (WhatsApp, email)
- Sin visibilidad en tiempo real del estado de cada etapa
- Sin datos históricos para planificación confiable

### 8.4 Gestión / Gobierno
- Sin gobernanza de proceso ni control de cumplimiento
- Sin SLAs entre áreas internas
- Sin métricas de desempeño del proceso
- Sin accountability por demoras en el ciclo
- Sin política formal sobre requisitos previos a ejecución

### 8.5 Entorno / Contexto
- Alta presión por disponibilidad de equipos
- Proveedor ubicado en María Elena (logística obligatoria)
- Proveedor condiciona certificado a OC (regla razonable)
- Múltiples proveedores según tipo de equipo
- Proceso fue creciendo orgánicamente sin diseño formal

### 8.6 Conclusión Ishikawa

El problema es **sistémico**, no puntual ni de una sola área. La mayor concentración de causas está en **Método** (diseño de proceso), seguida de **Tecnología/Sistema** (herramientas) y **Gestión/Gobierno** (accountability). Esto refuerza que la intervención principal debe ser el rediseño del proceso (RC1) con gates de control (RC3), soportado por un sistema de registro (RC4) y gobernanza explícita (RC2).
