# Fase 1 (RA1) — Visión del Producto y Modelo de Negocio de la API

## Billetera de Ahorro

> **Entregable U1:** *"Documento de objetivos, anatomía y naturaleza de las APIs del sistema"*
> **Rúbrica:** *Justificación de Negocio y Anatomía* — 4 puntos
> **Relacionados:** [`TABLERO-IDEACION.md`](./TABLERO-IDEACION.md) · [`ARQUITECTURA.md`](./ARQUITECTURA.md) · [`RESUMEN-MATERIA.md`](./RESUMEN-MATERIA.md)

**Supuestos del equipo, no datos verificados:** el producto lo lanza un banco ya establecido en Ecuador (existen core bancario, identidad y notificaciones), la moneda es USD, y el segmento objetivo son adultos jóvenes que ya tienen cuenta pero no tienen hábito de ahorro. Las cifras de §5 son ilustrativas. Las afirmaciones de mercado de §1 están planteadas en términos cualitativos a propósito: antes de entregar hay que respaldarlas con fuentes citables (BCE, Superintendencia de Bancos, Global Findex), porque un dato sin fuente resta más de lo que suma.

---

## 1. El problema

**Del lado del cliente**, el ahorro no es un hábito sino un residuo: se ahorra "lo que sobra" a fin de mes, y no sobra. A eso se suma que el retorno es opaco —nadie sabe cuánto va a tener en 18 meses— y que los productos tradicionales piden montos mínimos altos, plazos rígidos y, muchas veces, ir a una agencia.

**Del lado del banco**, el depósito a la vista es barato pero volátil: puede retirarse cualquier día, lo que encarece los requerimientos de liquidez y limita la colocación a plazo. Captar un ahorrador en agencia cuesta tiempo de personal y papel. Y cuando alguien abandona la apertura en el canal digital, el banco no sabe en qué paso se fue ni por qué.

El cruce de ambos problemas define el producto: automatizar el aporte resuelve el hábito, mostrar la proyección desde el primer clic resuelve la opacidad, y **no exigir monto mínimo** resuelve la barrera. A cambio, el banco obtiene permanencia, recurrencia y un embudo de apertura medible.

> Una corrección al tablero: la nota *"activos inmediatos"* está mal nombrada. Un depósito de ahorro es un **pasivo** en el balance. El valor está en que es un pasivo barato y estable que fondea la cartera de crédito, que sí es el activo rentable. Conviene decirlo como **"captación inmediata de depósitos: fondeo estable y de bajo costo"**.

---

## 2. Qué hace el producto

Billetera de Ahorro permite fijar una meta, elegir cuánto y cuándo aportar, y ver desde el primer minuto cuánto dinero se tendrá al final. El aporte se debita solo; el sistema acompaña con progreso visible, notificaciones y reportes; y si el cliente bloquea su ahorro, gana mejor tasa.

**Features**

- Simula el retorno en el tiempo con intereses.
- Genera plan de ahorro.
- A través de un stepper el usuario elige objetivo, monto, interés, tiempo y confirmación.
- Ahorro **sin monto mínimo ni máximo**.
- Da opción de bloquear el ahorro para ganar más interés.
- Permite crear varios planes de ahorro.
- Débito automático desde cuenta, con fecha de débito elegible.
- Notificaciones del sistema: débitos, cambios en el plan, fechas.
- Visualización del progreso de la meta: barra de avance y porcentaje de cumplimiento.
- Reportes con el historial de planes y los movimientos de cada uno.
- Cancelar el plan en cualquier momento y recuperar los fondos; si estaba bloqueado, pierde los intereses devengados.

**Beneficios para el banco.** Captación inmediata de depósitos; asegura el dinero en ahorro por más tiempo; provee educación bancaria al usuario; ayuda a disminuir las objeciones; barrera de entrada baja para captar un segmento joven; permite levantar datos de dónde se detienen los usuarios al generar el plan; y usa la barra de progreso para sostener la constancia sin costo de canal.

**Beneficios para el cliente.** Puede ganar más intereses; tiene un objetivo planificado desde el inicio; puede llevar varios objetivos a la vez; ve exactamente cuánto tendrá al final del período; puede iniciar con poco y crecer sin límite; y el interés varía según el valor meta y el tiempo del plan.

**Cobranza.** El cargo se intenta el día que el cliente eligió y, si falla, se reintenta cada 24 horas hasta **5 veces**. Si al quinto intento no se logró el descuento, **la cuota se cancela** y **el plazo del plan crece un mes**: no hay mora, no se acumulan deudas y nunca se cobran dos cuotas juntas. El plan se completa cuando el saldo alcanza el objetivo, y recién ahí se liquidan los fondos al cliente. Cada plan genera **su propio cargo**: quien tenga tres planes que se debitan el mismo día ve tres cargos, no uno agregado.

> Lo que esta regla cambia es la naturaleza de la promesa: el producto deja de comprometer una **fecha** y compromete un **monto**. El cliente nunca ve un cargo que no reconoce ni entra en mora, pero su meta puede tardar más de lo previsto.

### Principios de producto

1. **La proyección antes del compromiso.** El usuario ve cuánto tendrá al final *antes* de registrarse: la simulación es pública y anónima a propósito.
2. **El ahorro no se pide, se programa.** El débito automático es el corazón del producto, no una opción secundaria.
3. **Cada centavo es reconstruible.** El saldo se calcula desde un historial inmutable de movimientos, no se sobrescribe.

---

## 3. Objetivos de las APIs

Las cinco dimensiones del diseño de APIs (U1 §1.2) aplicadas a este producto:

| Dimensión | Cómo se materializa aquí |
|---|---|
| **Interoperabilidad** | La capacidad de ahorro se expone como contrato REST consumible por la banca web, la PWA y mañana por un socio externo, sin tocar el core bancario |
| **Modularidad** | Frontend y backend evolucionan por separado: la frontera es el `openapi.yaml`. La tabla de tarifas cambia sin redesplegar la app |
| **Escalabilidad** | Nuevos tipos de plan se agregan como recursos nuevos, sin refactorizar el núcleo |
| **Estandarización** | REST + OpenAPI 3.1 + OAuth 2.0 + JSON. Ningún consumidor necesita documentación privada ni SDK propietario |
| **Seguridad** | OAuth 2.0 con PKCE, tokens fuera del navegador, ledger inmutable y auditoría por movimiento |

Los objetivos de negocio que el MVP debe poder medir: captar depósito recurrente (saldo bajo gestión y aportes/mes), aumentar la permanencia (% de planes con bloqueo activo), reducir el costo de adquisición (% de aperturas sin intervención humana), y cerrar el embudo de apertura (conversión de simulación a plan creado).

---

## 4. La cadena de valor de las APIs

Ubicación en los tres niveles de madurez de U3 §3.2:

| Nivel | En este producto | Estado |
|---|---|---|
| **Supervivencia** — conectividad de sistemas | La API integra core bancario, identidad, cobros y notificaciones, que hoy son silos | ✅ MVP |
| **Ventaja competitiva** — habilitación omnicanal | El mismo contrato sirve a web y móvil sin duplicar lógica | ✅ MVP |
| **Ventaja competitiva** — socios y monetización | Ahorro embebido: un comercio o fintech ofrece "ahorrá para esto" usando nuestra API | 🔜 Fase 2 |
| **Diferenciación** — máximo valor de negocio | El historial de cumplimiento se vuelve insumo de scoring crediticio propio | 🔜 Visión |

El último nivel es lo que hace que valga la pena construirlo como APIs y no como una pantalla más: un cliente que sostuvo 18 aportes es un sujeto de crédito con evidencia, no con estimación, y ese dato no lo tiene ningún buró.

---

## 5. Monetización

Según la taxonomía de U1 §1.6, este producto es **monetización indirecta**: la API no genera cobro directo, pero impulsa el producto que sí deja margen. No hay pay-per-call, ni suscripción, ni freemium. El usuario no paga por ahorrar y el banco no se cobra a sí mismo por llamar a su propio endpoint.

Las palancas de ingreso son cuatro:

1. **Spread de intermediación.** El banco paga tasa pasiva por el depósito y coloca esos fondos a tasa activa. El margen es la diferencia, por saldo y por permanencia. Es la palanca de mayor volumen.
2. **Calidad del fondeo.** Un depósito bloqueado a plazo es fondeo estable: mejora los indicadores de liquidez y permite colocar a plazos más rentables. Vale más que el mismo monto a la vista, y por eso el bloqueo se paga con mejor tasa.
3. **Reducción del costo de adquisición.** Apertura autoservicio en lugar de agencia. No es ingreso, es margen liberado, y es la palanca de efecto más inmediato.
4. **Canal de socios (futuro).** Ahorro embebido bajo acuerdo B2B. Es el único escenario donde aparecería monetización directa: revenue share o tarifa por volumen.

**Ejemplo ilustrativo, no proyección** *(reemplazar con las tasas reales del banco)*: con cuota promedio de USD 50, permanencia de 18 meses y saldo promedio de ≈USD 450, un spread de 10 puntos entre tasa pasiva y activa deja un margen financiero bruto de **≈USD 67 por cliente en el ciclo**. A eso se le resta el costo de servicio del canal digital.

La conclusión importa más que el número: el margen unitario es pequeño, **el negocio es de volumen y permanencia**. Por eso la ausencia de monto mínimo prioriza la conversión de simulaciones en planes, el bloqueo es la feature con mejor retorno por esfuerzo, y la arquitectura tiene que ser barata de operar —un costo de servicio alto se come el margen.

**Lo que se descartó y por qué.** *Pay-per-call:* el consumidor es la propia app del banco; cobrarse a sí mismo es contabilidad interna, no ingreso. *Freemium con límite de planes:* contradice la feature de múltiples planes y reduce el depósito captado. *Comisión al ahorrador:* cobrar por ahorrar destruye la propuesta de valor. *Venta de datos:* inaceptable legal y éticamente; el dato se usa internamente para scoring propio, con base legal y consentimiento.

---

## 6. Ecosistema de APIs

Siguiendo la clasificación de U1 §1.5, el MVP es principalmente de **ecosistema interno**: las APIs sirven a la app propia y quedan disponibles para otros equipos del banco. Hay una porción **pública acotada** —solo la simulación y la consulta de tarifas son anónimas, para permitir simular antes de registrarse— y un **ecosistema de socios** previsto para Fase 2, bajo contrato formal y OAuth con scopes restringidos.

Exponer la simulación sin autenticación es una decisión de negocio (bajar la barrera de entrada) con consecuencia arquitectónica: es superficie de ataque y de abuso de costo, y por eso lleva rate limiting más estricto que los endpoints autenticados.

---

## 7. Anatomía de la API

Las 8 capas de U1 §1.3 aplicadas a esta API:

| # | Capa | En Billetera de Ahorro |
|---|---|---|
| 1 | **Endpoints** | `/v1/planes-ahorro` · `/v1/simulaciones` · `/v1/tarifas` · `/v1/planes-ahorro/{id}/movimientos` · `/v1/notificaciones` · `/webhooks/core-bancario/debitos` |
| 2 | **Métodos** | `GET` consultar · `POST` crear, simular, bloquear, cancelar · `PATCH` cambiar fecha de débito. **Sin `DELETE`**: un plan se cancela como cambio de estado; el historial financiero no se borra |
| 3 | **Recursos** | `PlanAhorro`, `Cuota`, `Movimiento`, `Tarifa`, `Notificacion`, `CuentaDebito`, `CorridaCobro` |
| 4 | **Parámetros** | *Path:* `{planId}` · *Query:* `?estado=`, `?cursor=`, `?limite=` · *Headers:* `Authorization`, `Idempotency-Key`, `X-Request-Id` · *Body:* JSON validado contra el esquema |
| 5 | **Formato** | JSON. Montos como entero de centavos + ISO 4217. Fechas ISO 8601 UTC. Errores en `application/problem+json` |
| 6 | **Códigos de estado** | `200` · `201`+`Location` · `202` (cobro aceptado, asíncrono) · `400` · `401` · `403` · `404` · `409` (conflicto de estado) · `429`+`Retry-After` · `500` |
| 7 | **Autenticación / Autorización** | OAuth 2.0 Authorization Code + PKCE; JWT como formato del access token; scopes por recurso; RBAC (`CLIENTE`, `OPERADOR`, `AUDITOR`); ABAC para titularidad del plan |
| 8 | **Documentación** | `contracts/openapi.yaml` (OpenAPI 3.1) como única fuente de verdad, publicado con Swagger UI |

Un ejemplo del viaje completo: el cliente envía `POST /v1/planes-ahorro` **(1)** con verbo de creación **(2)**, el cuerpo con meta, plazo y cuota **(3)**, header `Authorization: Bearer <JWT>` que el gateway valida **(7)** e `Idempotency-Key` para que un reintento de red no cree dos planes. El servicio congela la tarifa, genera el calendario de cuotas y asienta el movimiento inicial en el ledger. Responde `201 Created` **(6)** con `Location` y un JSON **(5)** que incluye el estado del plan y la proyección del monto final.

---

## 8. Naturaleza de la API

Las cuatro dimensiones del contrato digital (U1 §1.4):

| Naturaleza | Cómo se manifiesta |
|---|---|
| **Intermediaria** | Es el puente entre el cliente y tres sistemas que él nunca ve: el core bancario, el proveedor de identidad y el motor de notificaciones. El cliente pide "crear mi plan"; la API traduce eso a tres conversaciones distintas |
| **Abstracta** | El consumidor no sabe —ni necesita saber— que el saldo se reconstruye desde un ledger de eventos, que el cobro es un proceso batch con checkpoint, ni que hay un circuit breaker protegiendo la llamada al core. Pide un plan y recibe un saldo |
| **Contractual** | El `openapi.yaml` define entradas y salidas antes de que exista código. El contrato es doble: el técnico con el desarrollador y el financiero con el cliente, porque la tasa aplicada queda fijada en el plan al contratar |
| **Evolutiva** | Versionamiento SemVer: los cambios aditivos no rompen integraciones; uno disruptivo exige salto de versión mayor, documentación paralela de v1 y v2 y guía de migración |

Sobre el ciclo de vida (U1 §1.8): hoy estamos en **diseño**, estableciendo el contrato `v1`. La **evolución** traerá el canal de socios con v1 y v2 conviviendo. El **retiro** de v1 se anunciará con ventana de migración y responderá `410 Gone` en los endpoints dados de baja.

---

## 9. Indicadores

| Categoría | Qué se mide |
|---|---|
| **Negocio** | Saldo bajo gestión · aportes recurrentes/mes · % de planes bloqueados · % de cuotas canceladas por falta de fondos |
| **Producto** | Conversión simulación → plan creado · planes activos por cliente |
| **API** | p95 < 500 ms · error rate < 1% · RPS sostenido · punto de ruptura (validados con k6 en Fase 4) |
| **Operación** | % de cobros exitosos al primer intento · corridas de cobro completadas sin reinicio |

> La conversión y el abandono **por paso del stepper** quedan como trabajo futuro: el backend solo ve la simulación y la creación del plan, así que el MVP mide el embudo entre esos dos puntos.

---

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| **El plazo se estira sin tope** si el cliente falla cuotas repetidamente, y la meta se aleja | Notificar cada prórroga con la nueva fecha estimada y sugerir bajar la cuota antes que abandonar el plan |
| **Cuotas elegidas por optimismo** que el cliente no logra sostener | La simulación muestra la proyección exacta antes de comprometerse, y la fecha de débito elegible permite alinear el cargo con el día de cobro |
| **Sin monto mínimo, una cuota muy pequeña cuesta más cobrarla que lo que capta** | Aceptado para el alcance del proyecto porque refuerza la barrera de entrada cero; un producto real necesitaría un piso operativo |

---

## 11. Qué queda por decidir

1. ¿Un error técnico del banco (timeout, servicio caído) debe consumir uno de los 5 intentos? ¿Y cuándo se suspende un plan cuyo plazo se estira indefinidamente?
2. Reemplazar las cifras ilustrativas de §5 por tasas reales o un rango citado.
3. Respaldar las afirmaciones de mercado de §1 con fuentes citables.
