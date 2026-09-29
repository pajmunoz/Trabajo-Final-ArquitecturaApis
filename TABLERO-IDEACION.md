# Tablero de ideación — "Billetera de ahorro"

> Transcripción del canvas colaborativo (Miro/FigJam). Todas las notas fechadas **21 Sep**.
> Colaboradores visibles en el canvas: *Fancy Sparrow*, *Honorable Salamander*.
> Este documento es el **insumo de la Fase 1 (RA1)** del proyecto final. Ver [`TAREA-FINAL.md`](./TAREA-FINAL.md).

---

## Transcripción literal

### Columna 1 — Features

| # | Nota |
|---|---|
| F1 | Genera plan de ahorro |
| F2 | Simula el retorno en el tiempo con intereses |
| F3 | Da opción de bloquear el ahorro para ganar más interés |
| F4 | Ahorro desde **10 USD** mensuales sin tope |
| F5 | Permite crear varios planes de ahorro |
| F6 | A través de un stepper el usuario elige su objetivo, monto, interés, tiempo, confirmación |
| F7 | Se puede elegir la fecha del débito |
| F8 | Débito automático desde cuenta |
| F9 | Visualización de hitos en el progreso |
| F10 | Notificaciones del sistema: débitos, expiración del plan de ahorro, fechas, etc. |
| F11 | Comparador de escenarios para la simulación del plan de ahorro:<br>· El usuario elige el monto de ahorro<br>· El usuario ingresa sus gastos mensuales |
| F12 | Dependiendo del monto que tenga, puede acceder a otros beneficios — por ejemplo un crédito teniendo como garantía el valor del ahorro, pero inmediatamente se congela el valor y **no** puede retirarlo ⁽¹⁾ |
| F13 | Reportes con su historial de planes de ahorro |

⁽¹⁾ La nota dice literalmente *"el valor ko puede retirarlo"* — typo de tipeo por *"no puede retirarlo"*.

### Columna 2 — Beneficios banco

| # | Nota |
|---|---|
| BB1 | Activos inmediatos ⁽²⁾ |
| BB2 | Se asegura el dinero en ahorro por más tiempo |
| BB3 | Provee educación bancaria al usuario ⁽³⁾ |
| BB4 | Ayuda a disminuir las objeciones |
| BB5 | Barrera de entrada baja para captar un segmento joven |
| BB6 | **(Pregunta abierta)** Se generan *n* intentos de cobro por la cuota pendiente durante *n* días; si en ese tiempo no se logró recaudar y llega la siguiente cuota, ¿se debitarán las dos? ⁽⁴⁾ |
| BB7 | Nos permite levantar datos de dónde se detienen los usuarios al momento de generar el plan |
| BB8 | Visualización de metas mediante barras de progreso, badges/medallas por consistencia y bonificaciones de tasa de interés al cumplir hitos ⁽⁵⁾ |

⁽²⁾ Ver observación en [§ Hallazgos](#hallazgos-y-decisiones-pendientes).
⁽³⁾ Nota literal: *"E provee ducación bancaria a usuario"*.
⁽⁴⁾ Redacción original entrecortada por el tamaño de la nota. **Ya resuelta** por el equipo; ver [§ Hallazgos 3](#3-bb6--resuelto-por-el-equipo).
⁽⁵⁾ Está en la columna del banco pero describe una *feature*; ver [§ Hallazgos](#hallazgos-y-decisiones-pendientes).

### Columna 3 — Beneficios cliente

| # | Nota |
|---|---|
| BC1 | Tener un objetivo de ahorro planificado desde el inicio |
| BC2 | Puede ganar más intereses |
| BC3 | Permite tener varios objetivos de ahorro |
| BC4 | Puede ver exactamente cuánto dinero tendrá al final del período |
| BC5 | Puede iniciar con poco y crecer sin límite |
| BC6 | El interés varía dependiendo del valor meta del ahorro y tiempo del mismo |

---

## Cambios respecto a la versión anterior del tablero

| Cambio | Detalle |
|---|---|
| **Monto mínimo bajó** | De **50 USD** → **10 USD** mensuales. Refuerza BB5 (captar segmento joven). |
| **Se eliminó "Billetera compartida"** | La feature *"Billetera compartida, para parejas, familias"* ya no aparece. **La arquitectura no la contempla.** Si fue un descarte deliberado, está bien; si fue accidental, hay que reponerla antes de cerrar la Fase 1 porque cambia el modelo de datos (titularidad N:N sobre el plan). |
| **Features nuevas** | F7 (fecha del débito), F8 (débito automático), F9 (hitos), F10 (notificaciones), F11 (comparador de escenarios), F12 (crédito con garantía), F13 (reportes). |
| **Beneficios banco nuevos** | BB4, BB5, BB6, BB7, BB8. |
| **Beneficio cliente nuevo** | BC6 (tasa variable según meta y plazo). |

---

## Hallazgos y decisiones pendientes

### 1. "Activos inmediatos" (BB1) está mal nombrado
Un plan de ahorro genera **pasivos** para el banco (depósitos del cliente), no activos. Esos depósitos sí son la materia prima barata con la que el banco fondea su cartera de crédito, que es donde está el negocio real. Recomendación de redacción para el documento de Fase 1:

> **"Captación inmediata de depósitos: fondeo estable y de bajo costo."**

Es un detalle de vocabulario, pero la rúbrica evalúa *"justifica la necesidad de negocio… con sustento estratégico"* y un revisor del área financiera lo va a notar.

### 2. BB8 no es un beneficio del banco, es una feature
*"Visualización de metas mediante barras de progreso, badges/medallas…"* describe **qué hace el producto**, no qué gana el banco. El beneficio del banco derivado de esa feature es: **retención y permanencia del depósito sin costo de canal**. Sugerencia: mover BB8 a la columna Features (fusionándola con F9) y dejar en la columna del banco el beneficio real.

### 3. BB6 — resuelto por el equipo
La pregunta del tablero era *"¿se debitarán las dos cuotas?"*. **El equipo la resolvió así:**

- El cargo se intenta el día elegido y, si falla, **se reintenta cada 24 horas hasta 5 veces** (D … D+4).
- Si el quinto intento falla, **la cuota se cancela**: no se cobra, no queda en mora y no se arrastra.
- **El plazo del plan aumenta un mes.**
- El plan se completa **cuando el saldo alcanza el monto meta**, y recién entonces se liquidan los fondos al cliente.

La consecuencia es que **el plazo se vuelve elástico**: el producto promete un monto, no una fecha. Desaparecen la mora, la suspensión por impago y el cobro doble.

Quedan dos cabos sueltos: si un **error técnico** del banco debe consumir uno de los 5 intentos (no es un cargo rechazado, es una petición que no llegó), y **cuándo se suspende** un plan cuyo plazo se estira sin tope.

### 4. F12 (crédito con garantía del ahorro) — ❌ fuera de alcance
Es una feature excelente para el caso de negocio, pero un crédito pignorado implica originación crediticia, scoring, provisiones y normativa (en Ecuador, regulación de la Superintendencia de Bancos / JPRMF).

La propuesta inicial era acotarla a precalificación más congelamiento del saldo. **En el recorte del 22 de septiembre quedó fuera por completo** (ver hallazgo 7): ni siquiera la versión acotada aporta puntos de rúbrica que otra feature no demuestre ya.

### 5. BC6 + F3 son las dos palancas de monetización
- **F3 (bloqueo)** permite tasas escalonadas por plazo → el banco asegura permanencia (BB2) a cambio de tasa.
- **BC6 (tasa según meta y plazo)** es una tabla de tramos, no una constante en código.
  - *Propuesta original:* tabla **versionada** con anclaje del cliente a la versión vigente el día que contrató (la filosofía de Stripe, [`RESUMEN-MATERIA.md` § 3.11](./RESUMEN-MATERIA.md#311-gestión-del-cambio-la-promesa-de-estabilidad)).
  - *Decisión del 22 de septiembre:* se simplifica a una **tabla de tramos fija en configuración**. La tasa aplicada se guarda en el plan al contratar, que conserva la garantía para el cliente sin construir el motor de versionado.

### 6. BB7 exige telemetría de producto desde el día 1
*"Levantar datos de dónde se detienen los usuarios al generar el plan"* significa que **cada paso del stepper (F6) debe emitir un evento**. Esto no es un extra: es un requisito funcional que define eventos de dominio y, por tanto, arquitectura. Está contemplado en el diseño event-driven.

### 7. Recorte de alcance — 22 de septiembre de 2026
El alcance definitivo quedó fijado en [`REQUERIMIENTOS.md` §0](./REQUERIMIENTOS.md). El criterio del recorte fue que **la rúbrica no cuenta features en ningún lado**: califica que el contrato OpenAPI sea limpio, que la arquitectura esté justificada, que haya autenticación JWT, más del 80% de cobertura y reportes de carga. Cada feature extra es costo puro contra esos cuatro criterios — un endpoint más que documentar sin inconsistencias, más código que cubrir y más superficie que someter a k6.

Con ese filtro, una feature solo se justifica si demuestra un patrón que la rúbrica premia y que ninguna otra ya demuestra.

**Quedaron fuera:** crédito con garantía del ahorro (F12) · badges, medallas y bonificación de tasa por hitos (parte de F9/BB8) · comparador de escenarios (F11) · modalidad de ahorro por porcentaje de ingresos · micro-ahorro por redondeo de compras · rescate parcial de fondos · simulador con recomendación de cuota · motor de tarifas versionado · codificación ISO 20022 del log de auditoría.

**Se conservó de F9/BB8** la barra de progreso y el porcentaje de cumplimiento: es un campo calculado (`saldo / montoMeta`), cuesta prácticamente nada y sostiene la demo.

**Otras dos decisiones cerradas el mismo día:**
- **Nombre del producto: "Billetera de Ahorro".** Se descartan "bolsillos" (del documento de requerimientos) y "Plan de ahorro".
- **Monto mínimo: no hay.** El tablero decía *"desde 10 USD"* (F4); la decisión final es **sin mínimo ni máximo**, lo que refuerza el argumento de barrera de entrada (BB5). La contrapartida operativa —una cuota muy pequeña cuesta más cobrarla que lo que capta— queda aceptada para el alcance del proyecto.

---

## Matriz de trazabilidad Feature → Beneficio

| Feature | Beneficio banco | Beneficio cliente |
|---|---|---|
| F1 Genera plan de ahorro | BB1 Captación inmediata de depósitos | BC1 Objetivo planificado desde el inicio |
| F2 Simula el retorno con intereses | BB4 Disminuye objeciones · BB3 Educación bancaria | BC4 Ve exactamente cuánto tendrá al final |
| F3 Bloqueo para ganar más interés | BB2 Asegura el dinero por más tiempo | BC2 Puede ganar más intereses |
| F4 Ahorro sin monto mínimo ni máximo ⁽ᵃ⁾ | BB5 Barrera de entrada baja, capta segmento joven | BC5 Inicia con poco y crece sin límite |
| F5 Varios planes de ahorro | *Más productos por cliente: sube saldo promedio y ticket* | BC3 Varios objetivos de ahorro |
| F6 Stepper de creación | BB7 Telemetría de abandono · *onboarding autoservicio, CAC bajo* | *Abre su plan en minutos sin ir a agencia* |
| F7 Elegir fecha del débito | *Alinea el cobro con el día de pago → sube la tasa de recaudo* | *Debita cuando sí tiene fondos* |
| F8 Débito automático | *Recurrencia predecible del flujo de captación* | *No depende de acordarse de ahorrar* |
| F9 + BB8 Barra de progreso y % de cumplimiento | *Retención y consistencia sin costo de canal* | *Motivación sostenida* |
| ~~F9 + BB8 Badges, medallas y bonificación de tasa~~ | ❌ **fuera de alcance** (hallazgo 7) | — |
| F10 Notificaciones | *Reduce mora y consultas al call center* | *Enterado de débitos y vencimientos* |
| ~~F11 Comparador de escenarios~~ | ❌ **fuera de alcance** (hallazgo 7) | — |
| ~~F12 Crédito con garantía del ahorro~~ | ❌ **fuera de alcance** (hallazgo 7) | — |
| F13 Reportes e historial | *Insumo para scoring crediticio propio* | *Historial que le sirve para pedir crédito después* |
| — | BC6 tasa variable según meta y plazo (**tabla de tramos fija**) | BC6 |

⁽ᵃ⁾ El tablero original decía *"desde 10 USD"*; la decisión final del 22 de septiembre eliminó el mínimo. Ver hallazgo 7.
