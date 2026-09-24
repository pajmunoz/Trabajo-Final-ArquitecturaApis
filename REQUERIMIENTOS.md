# Requerimientos — Billetera de Ahorro

> Convertido de `Requerimientos.docx`. **Este archivo es ahora el editable**; el `.docx` queda como respaldo.
> Relacionados: [`TABLERO-IDEACION.md`](./TABLERO-IDEACION.md) · [`VISION-NEGOCIO.md`](./VISION-NEGOCIO.md) · [`ARQUITECTURA.md`](./ARQUITECTURA.md) · [`TAREA-FINAL.md`](./TAREA-FINAL.md)

---

## El criterio para recortar

La rúbrica **no cuenta features en ningún lado**. Lo que califica es:

| Criterio | Pts | Qué mide |
|---|---|---|
| 2 | 5 | Que la arquitectura esté justificada y aplique patrones (nombra *paginación, filtros y resiliencia* como esenciales) |
| 3 | 4 | Que el contrato OpenAPI sea maduro, limpio, sin errores y autocontenido |
| 4 | 5 | OAuth2/JWT + **>80% de cobertura** + reportes de estrés |
| 5 | 2 | Que esté desplegado y que el grupo lo domine |

Cada feature extra es **costo puro** contra esa rúbrica: un endpoint más que documentar sin inconsistencias, más código que cubrir al 80%, más superficie que someter a k6 y más que defender en la sustentación. Una feature solo se justifica si **demuestra un patrón que la rúbrica premia y que ninguna otra feature ya demuestra**.

Con ese filtro, abajo está la clasificación.

---

## 0. ALCANCE FINAL APROBADO

> **Decisiones del equipo — 22 sep 2026.** Esta sección manda sobre todo lo demás del archivo. Las secciones 1–4 quedan como el análisis que llevó hasta acá.

**Nombre del producto: `Billetera de Ahorro`.** Se descartan "bolsillos" y "Plan de ahorro". Único nombre en todos los documentos.

### Requerimientos funcionales — lista definitiva

| ID | Requerimiento | Nota |
|---|---|---|
| **RF-01.1** | Crear uno o varios planes con nombre, monto objetivo y plazo | **Sin monto mínimo ni máximo** |
| **RF-01.2** | Modalidad de ahorro: **cuota fija mensual** | Se elimina la modalidad por porcentaje de ingresos |
| **RF-01.3** | Elegir y modificar la fecha mensual del débito | |
| **RF-01.4** | Consultar y filtrar el historial de planes (activos, completados, cancelados) | Filtros + paginación por offset |
| **RF-01.5** | Consultar los movimientos de un plan | Paginación por cursor |
| **RF-01.6** | Bloquear el plan a plazo para obtener mejor tasa | Un booleano y una tasa; sostiene la monetización |
| **RF-02.1** | Simular el rendimiento proyectado (monto acumulado + intereses) | Público y anónimo. Sin recomendación de cuota por ingresos |
| **RF-03.1** | Programar y ejecutar el débito automático | Con la política de 5 intentos a 24 h |
| **RF-04.1** | **Cancelar** un plan y devolver los fondos a la cuenta principal | Antes llamado "rescate total". Se elimina el rescate parcial |
| **RF-04.2** | Penalidad al cancelar un plan bloqueado: pierde los intereses devengados | Regla única, sin tabla |
| **RF-05.1** | Mostrar el progreso de la meta (barra y porcentaje) | Campo calculado `saldo / montoMeta`, no es un endpoint |
| **RF-05.2** | Notificar débitos ejecutados y eventos del plan | Demuestra EDA |

### Requerimientos no funcionales — lista definitiva

| ID | Requerimiento | Cambio |
|---|---|---|
| **RNF-01.1** | **p95 < 500 ms** en endpoints síncronos | ⚠️ **Corregido**: el `.docx` decía 1.5 s; la rúbrica exige 500 ms |
| **RNF-01.2** | Procesamiento batch del corte de débitos | Sin cambios |
| **RNF-01.3** | Escalado horizontal automático | Sin cambios |
| **RNF-02.1** | OAuth 2.0 + JWT de corta duración | Sin cambios — exigido por la rúbrica |
| **RNF-02.2** | TLS 1.3 en tránsito, AES-256 en reposo | Sin cambios |
| **RNF-02.3** | Consistencia ACID en los movimientos de saldo | Sin cambios |
| **RNF-03.1** | Desacoplamiento del core legacy vía EDA | Sin cambios |
| **RNF-03.2** | Disponibilidad 99.9% | Se declara como **meta de diseño**, no como resultado medido |
| **RNF-03.3** | Auditoría inmutable por transacción | ⚠️ **Se elimina la mención a ISO 20022**; la auditoría la provee el ledger |

### Eliminado del alcance

| Feature | Motivo |
|---|---|
| Modalidad por **porcentaje de ingresos** | Dominio nuevo: conocer ingresos y recalcular la cuota cada mes |
| **Micro-ahorro por redondeo** de compras | Exige integrarse al flujo de transacciones de tarjeta del core, en tiempo real |
| **Rescate parcial** de fondos | Obliga a recalcular plan, calendario e intereses en caliente. La cancelación total cubre el caso real |
| **Crédito con garantía del ahorro** (pignoración) | Originación crediticia: scoring, provisiones, normativa |
| **Badges, medallas y bonificación de tasa** por hitos | Motor de reglas de gamificación; la barra de progreso ya cubre lo visual |
| **Comparador de escenarios** | Adorno de demo, cero valor de rúbrica |
| **Simulador con recomendación** de cuota por ingresos/gastos | RF-02.1 ya da la carga para k6 |
| **Motor de tarifas versionado con anclaje** | Se reemplaza por una **tabla de tramos fija en configuración** |
| **ISO 20022** en el log de auditoría | Esquemas XML enormes, cero valor de rúbrica |

### Dos aclaraciones sobre el borde del alcance

| Punto | Decisión |
|---|---|
| **Aporte extraordinario voluntario** (`POST /planes-ahorro/{id}/aportes`) | **Fuera.** Nació cuando la política era el cargo doble y el cliente necesitaba una vía para salir de mora. Con la política de 5 intentos ya no hay mora: la cuota se cancela y el plazo crece un mes. El endpoint dejó de tener un problema que resolver, así que se elimina. |
| **Telemetría del stepper** (BB7 del tablero) | **Fuera — queda como trabajo futuro.** No es un RF del banco ni la exige la rúbrica, y no demuestra ningún patrón que el sistema no demuestre ya (el EDA lo cubren las notificaciones). Además, el backend no ve los pasos del stepper: elegir objetivo o monto ocurre en el cliente, así que medir cada paso obligaría a agregar un endpoint de eventos y un consumidor de analítica. Para el MVP, el embudo se mide con datos que ya existen: **simulaciones realizadas vs. planes creados** (`POST /simulaciones` → `POST /planes-ahorro`). |

### Trabajo futuro

| Feature | Qué haría falta |
|---|---|
| **Telemetría del stepper paso a paso** (BB7) | El frontend reporta cada paso completado (`onboarding.paso_completado`) a un endpoint de eventos o SDK de analítica; un consumidor lo lleva a un almacén analítico para calcular conversión y abandono por paso |

### Consecuencias a propagar

1. **`VISION-NEGOCIO.md`**: desaparece la palanca de monetización del **crédito pignorado** — quedan cuatro, no cinco. Y el argumento de barrera de entrada pasa de *"desde 10 USD"* a **"sin monto mínimo"**, que es más fuerte.
2. **`ARQUITECTURA.md`**: salen los endpoints de precalificación y pignoración, el de comparación de escenarios y los hitos/gamificación. Sale `saldoPignorado` del agregado. La `Tarifa` deja de ser versionada.
3. **`archmate/` y `c4/`**: eliminar los elementos de pignoración y gamificación.
4. **Superficie resultante: ~11 endpoints**, y los tres patrones esenciales de la rúbrica siguen demostrados — paginación (cursor y offset), filtros y resiliencia.

> **Nota operativa sobre el monto sin mínimo:** cada débito contra el core tiene un costo por transacción, así que una cuota muy pequeña cuesta más cobrarla que lo que capta. Para el alcance del proyecto no es un problema y refuerza el argumento de barrera de entrada cero; si el producto fuera real, habría que fijar un piso operativo.

---

## 1. Conflictos detectados

Antes de clasificar, cuatro cosas que hay que resolver porque el documento choca con decisiones ya tomadas.

| # | Conflicto | Detalle |
|---|---|---|
| C1 | **Monto mínimo** | RF-01.2 dice *"sin límite de monto mínimo o máximo"*. El tablero dice **"Ahorro desde 10 USD mensuales sin tope"** (F4), y ese mínimo es parte del argumento de negocio (barrera de entrada baja, BB5). *Sin tope máximo* sí coincide; *sin mínimo* no. **Propuesta: mínimo 10 USD, sin máximo.** |
| C2 | **Rescate de fondos** | RF-04.1 permite *rescate parcial o total en cualquier momento*. La decisión del equipo fue que **los fondos se liquidan solo al alcanzar el objetivo**. Son compatibles si se leen así: la vía normal es liquidación a la meta, y el rescate anticipado es **cancelación con penalidad** (que es justo lo que dice RF-04.2). **Propuesta: eliminar el rescate *parcial*, dejar solo cancelación total con penalidad.** El rescate parcial obliga a recalcular el plan entero en caliente. |
| C3 | **Nombre del producto** | El `.docx` habla de *"bolsillos"*, el tablero de *"Billetera de ahorro"*, tu último documento de *"Plan de ahorro"*. Tres nombres para lo mismo. **Hay que elegir uno** — todo lo demás (arquitectura, ArchiMate, C4) dice "Billetera de Ahorro". |
| C4 | **Qué falta en el `.docx`** | No menciona el **bloqueo del ahorro para ganar más interés** (F3), la **tasa variable según meta y plazo** (BC6), ni la **regla de cobranza de 5 intentos**. Las tres están decididas y son parte del producto. Hay que incorporarlas. |

---

## 2. Requerimientos funcionales — clasificados

### ✅ Núcleo necesario

Sin esto no hay proyecto, y cada uno demuestra algo que la rúbrica premia.

| ID | Requerimiento | Qué patrón de la rúbrica demuestra |
|---|---|---|
| **RF-01.1** | Crear uno o varios planes con nombre, monto objetivo y plazo | CRUD, validación por contrato, idempotencia |
| **RF-01.3** | Elegir y modificar la fecha del débito mensual | `PATCH` parcial, máquina de estados |
| **RF-01.4** | Consultar y seguir el historial de planes (activos, completados, cancelados) | **Filtros + paginación por offset** ← *esencial en la rúbrica* |
| **RF-02.2** | Calcular y proyectar el rendimiento financiero | Endpoint público cacheable; es la carga ideal para k6 |
| **RF-03.1** | Programar y ejecutar débitos automáticos en la fecha definida | **Resiliencia**: batch con checkpoint, circuit breaker, reintentos ← *esencial en la rúbrica* |
| **RF-05.2** | Notificar débitos ejecutados y avances | **EDA**: consumidor de eventos desacoplado |
| — | **Consultar movimientos del plan** *(no está en el `.docx`, hay que agregarlo)* | **Paginación por cursor** sobre colección append-only ← *esencial* |
| — | **Cancelar un plan** *(implícito en RF-01.4, hay que explicitarlo)* | Transición de estado + penalidad |
| — | **Bloqueo del ahorro para mejor tasa** (F3 del tablero) | Un booleano y una tarifa: costo casi nulo, y sostiene la monetización |

**Total: ~9 endpoints.** Es suficiente para demostrar *todos* los patrones que la rúbrica nombra.

### 🟡 Opcional — decidir según tiempo

Aportan al producto pero **no desbloquean ningún punto de rúbrica** que el núcleo no cubra ya.

| ID | Requerimiento | Costo real | Veredicto |
|---|---|---|---|
| **RF-02.1** | Simulador que recomienda cuota a partir de ingresos/gastos | Medio — es un endpoint más y lógica de recomendación | **Recortar a simulación simple.** RF-02.2 ya da la carga para k6; la recomendación es adorno |
| **RF-05.1** | Barras de progreso y % de cumplimiento | **Bajo** — es un campo calculado, no un endpoint | **Dejar.** Casi gratis y se ve muy bien en la demo |
| **RF-04.2** | Penalidad por rescate anticipado | Bajo si es un % fijo | **Dejar simplificado**: penalidad = pierde los intereses devengados. Sin tabla de reglas |
| — | **Tasa variable según meta y plazo** (BC6) | **Medio-alto** — motor de tarifas versionado con anclaje | **Simplificar**: tabla de tramos fija en configuración, sin versionado. El anclaje al contratar se puede explicar en el documento sin implementarlo completo |
| — | **Comparador de escenarios** (F11) | Medio — un endpoint más | **Opcional.** Buen demo, cero valor de rúbrica |

### ❌ Recomiendo descartar

Complejidad real, cero retorno en la rúbrica.

| ID | Requerimiento | Por qué fuera |
|---|---|---|
| **RF-01.2** (parte) | Modalidad *"porcentaje de ingresos/transacciones"* | Exige conocer los ingresos del cliente y recalcular la cuota cada mes. Es un dominio nuevo entero. **La cuota fija ya demuestra todo lo que hay que demostrar.** No está en la lluvia de ideas original |
| **RF-03.2** | Micro-ahorro por redondeo de compras con tarjeta | Requiere integrarse al flujo de **transacciones de tarjeta** del core — un sistema externo distinto, en tiempo real, con su propio contrato. Es el requerimiento más caro de toda la lista. No está en la lluvia de ideas original |
| **RF-04.1** (parte) | Rescate **parcial** de fondos | Obliga a recalcular plan, calendario, intereses devengados y proyección en caliente, con el plan vivo. La cancelación total resuelve el caso de uso real |
| — | **Crédito con garantía del ahorro / pignoración** (F12) | Ya venía marcado como riesgo de alcance. Es originación crediticia: scoring, provisiones, normativa. **Fuera** |
| — | **Badges, medallas y bonificación de tasa por hitos** (F9/BB8) | Motor de reglas de gamificación + efecto sobre la tasa. La barra de progreso (RF-05.1) ya cubre la parte visual a costo cero |

---

## 3. Requerimientos no funcionales — clasificados

### ✅ Núcleo necesario

| ID | Requerimiento | Nota |
|---|---|---|
| **RNF-01.1** | Tiempo de respuesta | **Ajustar a p95 < 500 ms**, que es lo que la rúbrica exige literalmente. El `.docx` dice 1.5 s, que es más laxo y dejaría puntos sobre la mesa |
| **RNF-01.2** | Procesamiento batch de débitos | Ya diseñado con chunking y checkpoint |
| **RNF-02.1** | OAuth 2.0 + JWT de corta duración | **Exigido explícitamente por la rúbrica.** Innegociable |
| **RNF-02.2** | TLS 1.3 en tránsito, AES-256 en reposo | Costo bajo, se configura |
| **RNF-02.3** | Consistencia ACID en movimientos de saldo | Gratis: una transacción local de PostgreSQL |
| **RNF-03.1** | Desacoplamiento del core legacy vía EDA | Es la decisión arquitectónica central del proyecto |

### 🟡 Opcional

| ID | Requerimiento | Veredicto |
|---|---|---|
| **RNF-01.3** | Escalado horizontal automático | **Dejar** si despliegan en Kubernetes: el HPA se configura en pocas líneas y luce en la sustentación del criterio 5 |
| **RNF-03.2** | Disponibilidad 99.9% | **Dejar declarado**, pero honestamente: no es verificable en un proyecto de dos semanas. Que el documento diga que es una meta de diseño, no un resultado medido |
| — | **Event Sourcing en el ledger** | Decisión de juicio. Suma en el criterio 2 (es un patrón de U2 §2.7) pero cuesta. Mi recomendación: **mantenerlo solo en el ledger** como ya está acotado en `ARQUITECTURA.md` §14 |

### ❌ Recomiendo descartar

| ID | Requerimiento | Por qué fuera |
|---|---|---|
| **RNF-03.3** (parte) | Auditoría **codificada en ISO 20022** | El log de auditoría inmutable **sí** va (el ledger ya lo da). Codificarlo en ISO 20022 es un estándar de mensajería financiera con esquemas XML enormes: semanas de trabajo y **cero** valor de rúbrica. **Quitar la mención al estándar, conservar la auditoría** |

---

## 4. Alcance recomendado del MVP

**Fuera:** porcentaje de ingresos · redondeo de compras · rescate parcial · crédito pignorado · gamificación con badges · ISO 20022.

**Dentro:** crear y listar planes · simular · débito automático con su política de reintentos · movimientos · notificaciones · cancelar con penalidad · bloqueo por tasa · barra de progreso.

Eso baja la superficie de ~20 endpoints a **~11**, que es lo que un equipo de cuatro personas puede documentar sin inconsistencias, cubrir al 80% y someter a k6 en el tiempo que queda.

**Todos los patrones que la rúbrica llama esenciales siguen demostrados:** paginación (cursor en movimientos, offset en planes), filtros (planes por estado), resiliencia (circuit breaker, reintentos, rate limiting, idempotencia).

---

## 5. Transcripción original del `.docx`

> Conservada íntegra como referencia. La clasificación de arriba es la propuesta de recorte, no un reemplazo.

### 1. Requerimientos Funcionales (RF)

*Los requerimientos funcionales definen lo que el sistema debe hacer (comportamiento, acciones y servicios).*

**RF-01: Gestión de Planes y Bolsillos de Ahorro**
- **RF-01.1:** El sistema debe permitir al cliente crear uno o múltiples planes/bolsillos de ahorro con un nombre personalizado, monto objetivo y plazo deseado.
- **RF-01.2:** El sistema debe permitir al cliente configurar la modalidad de ahorro: cuota fija mensual o porcentaje de ingresos/transacciones, sin límite de monto mínimo o máximo.
- **RF-01.3:** El sistema debe permitir al cliente seleccionar y modificar la fecha mensual en la que se ejecutará el débito automático.
- **RF-01.4:** El sistema debe permitir la consulta detallada y el seguimiento del historial de planes de ahorro (activos, completados o cancelados).

**RF-02: Simulador de Ahorro e Incentivos**
- **RF-02.1:** El sistema debe ofrecer un simulador dinámico donde el usuario ingrese sus ingresos/gastos estimados y el monto objetivo para recomendar la cuota y el tiempo ideal de ahorro.
- **RF-02.2:** El sistema debe calcular y proyectar el rendimiento financiero (intereses ganados) en función del monto acumulado y la permanencia del dinero.

**RF-03: Automatización de Débitos y Eventos**
- **RF-03.1:** El sistema debe programar y ejecutar débitos automáticos desde la cuenta principal vinculada hacia la billetera de ahorro en las fechas definidas por el usuario.
- **RF-03.2:** El sistema debe soportar reglas complementarias de micro-ahorro (como el redondeo de compras realizadas con tarjeta de débito).

**RF-04: Gestión de Liquidez y Rescate de Fondos**
- **RF-04.1:** El sistema debe permitir al cliente solicitar el rescate parcial o total de los fondos acumulados hacia su cuenta principal.
- **RF-04.2:** El sistema debe aplicar las políticas de penalidad o ajuste de tasa de interés correspondientes cuando se realiza un rescate antes del plazo fijado.

**RF-05: Notificaciones y Gamificación Visual**
- **RF-05.1:** El sistema debe mostrar indicadores visuales de progreso (barras de avance y porcentajes de cumplimiento de metas) en el panel principal.
- **RF-05.2:** El sistema debe enviar notificaciones al cliente confirmando débitos ejecutados, avances significativos en sus metas y recordatorios de fechas de abono.

### 2. Requerimientos No Funcionales (RNF)

*Los requerimientos no funcionales definen las cualidades y restricciones del sistema (rendimiento, seguridad, mantenibilidad y disponibilidad).*

**RNF-01: Rendimiento y Escalabilidad**
- **RNF-01.1 (Tiempo de Respuesta):** Las operaciones de consulta de saldos y progreso de metas deben responder en menos de 1.5 segundos en condiciones normales de operación.
- **RNF-01.2 (Procesamiento Batch):** El motor de débitos programados debe procesar lotes masivos fuera de horas pico sin degradar el rendimiento general de las APIs bancarias.
- **RNF-01.3 (Concurrencia):** La arquitectura de microservicios debe soportar escalado horizontal automático para responder a picos de demanda durante días de pago de nómina.

**RNF-02: Seguridad e Integridad de Datos**
- **RNF-02.1 (Autenticación y Autorización):** Todas las solicitudes entre componentes y clientes deben ser autenticadas mediante OAuth 2.0 con tokens JWT de corta duración.
- **RNF-02.2 (Cifrado de Datos):** La información financiera sensible debe cifrarse en tránsito usando TLS 1.3 y en reposo mediante AES-256.
- **RNF-02.3 (Consistencia ACID):** Todas las operaciones que impliquen transferencia de saldo entre la cuenta principal y los bolsillos deben ser atómicas y consistentes.

**RNF-03: Arquitectura, Mantenibilidad y Disponibilidad**
- **RNF-03.1 (Desacoplamiento):** El sistema debe diseñarse bajo una arquitectura de microservicios orientada a eventos (EDA) para evitar el acoplamiento con el Core Bancario Legacy.
- **RNF-03.2 (Disponibilidad):** La capa de APIs debe garantizar una disponibilidad del 99.9% (24/7), permitiendo consulta de saldos y simulación independientemente del horario bancario tradicional.
- **RNF-03.3 (Auditoría y Trazabilidad):** Cada transacción, cambio de regla o rescate de fondos debe generar un registro de auditoría inmutable codificado con estándar ISO 20022 o equivalente bancario.
