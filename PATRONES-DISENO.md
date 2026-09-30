# Patrones de diseño obligatorios


## 1. Adapter

**Dónde:** contenedor **Adaptador Core (Fachada)**. Se define la interfaz `CoreBancarioPort` con dos implementaciones, seleccionadas por perfil de Spring:
- `CoreLegacyAdapter`: traduce las llamadas del dominio a la interfaz SOAP/REST del Core Bancario Legacy.
- `CoreSimuladoAdapter`: responde sin depender del Core real (perfil de pruebas).

Atiende los dos flujos del diagrama de contenedores: la validación síncrona de titularidad y saldo que pide la Ahorro Core API (REST) y el consumo de `DebitoSolicitado` (AMQP).

**Por qué / impacto:**
- Aísla el dominio del legacy: si el Core cambia, solo se modifica el adaptador (RNF-03.1).
- La implementación simulada permite correr las pruebas unitarias y las pruebas de carga y spike con k6 (200 y 500 VUs) sin depender del Core real.
- Permite medir el rendimiento propio de la API sin el ruido del legacy.

---

## 2. Decorator

**Dónde:** dentro del **Adaptador Core**, como envoltorios sobre `CoreBancarioPort`:
`CircuitBreaker( Retry( Logging( CoreLegacyAdapter ) ) )`

**Por qué / impacto:**
- Circuit Breaker y Retry con backoff exponencial y jitter (1 s, 2 s, 4 s + aleatorio) se agregan por composición, sin modificar el adaptador (RNF-03.2). Corresponde al elemento "Circuit Breaker + Retry" de la vista ArchiMate.
- Cada capa de resiliencia se puede probar de forma aislada.
- La capa de logging registra errores y tiempos de respuesta, que la rúbrica pide.
- Solo cubre el reintento **técnico**. El reintento **de negocio** (5 intentos cada 24 h) lo gestiona el Batch Processor (ver patrón State).

---

## 3. Strategy

**Dónde:** **Ahorro Core API**, en el dominio del plan:
- `CalculoInteresStrategy`: tasa base o tasa con bono por bloqueo (RF-01.6).
- `PoliticaCancelacionStrategy`: cancelación sin penalidad o con pérdida de los intereses devengados si el plan está bloqueado (RF-04.1, RF-04.2).

**Por qué / impacto:**
- La simulación pública (RF-02.1) y el plan real usan el mismo cálculo, así que el valor simulado coincide con el real.
- Elimina las reglas duplicadas que hoy están en el frontend (`frontend/lib/store.ts`) y en los scripts de base de datos. Las tasas pasan a vivir solo en el backend.
- Son clases puras, fáciles de cubrir con pruebas unitarias (meta > 80 %).

---

## 4. State

**Dónde:**
- **Ahorro Core API**, para el ciclo de vida del plan: `ACTIVO → COMPLETADO` y `ACTIVO → CANCELADO` (RF-01.4).
- **Batch Processor**, para el ciclo de vida del débito: `PENDIENTE → EJECUTADO` o `PENDIENTE → FALLIDO`. Si el Core rechaza el cargo, se reprograma a las 24 h, hasta un máximo de 5 intentos (RF-03.1).

**Por qué / impacto:**
- Impide transiciones inválidas, como aportar a un plan cancelado o cancelar uno completado.
- Cada transición inválida se traduce directamente en un `409 Conflict` del contrato OpenAPI.
- La política de 5 intentos queda en un solo lugar y no repartida en condicionales.
- Expone al cliente el estado del débito (`PENDIENTE`, `EJECUTADO`, `FALLIDO`), que es la mitigación de consistencia eventual definida en la Fase 2 (§3.3).

---

## 5. Observer (eventos de dominio)

**Dónde:** según el diagrama de contenedores, los eventos viajan por RabbitMQ así:

| Publica | Evento | Consume |
|---|---|---|
| Ahorro Core API | `PlanCreado`, `PlanCancelado` | Sistema de Notificaciones |
| Ahorro Core API (aporte bajo solicitud) y Batch Processor (débito automático) | `DebitoSolicitado` | Adaptador Core |
| Adaptador Core | `DebitoEjecutado`, `DebitoFallido` | Batch Processor, Sistema de Notificaciones |

Dentro de cada servicio, los eventos se emiten como eventos de dominio (`ApplicationEventPublisher`) y un listener los envía al broker.

**Por qué / impacto:**
- Desacopla la API del Core legacy y de las notificaciones (RNF-03.1, RF-05.2).
- Absorbe el pico del corte diario de débitos (RNF-01.2).
- Los dos tipos de débito comparten el mismo evento, así que la resiliencia y la auditoría se implementan una sola vez.
- **Condición obligatoria (Transactional Outbox):** en la Ahorro Core API y el Batch Processor, que son los que escriben en PostgreSQL, el evento se guarda en una tabla `outbox` dentro de la misma transacción que la operación que lo origina (crear o cancelar el plan, registrar el débito como `PENDIENTE`). Se publica después del commit. Así nunca queda un cambio guardado sin su evento, ni un evento publicado de un cambio que no se guardó (RNF-02.3).
- Como el broker puede entregar un mensaje más de una vez, los consumidores deben ser idempotentes. El `correlation-id` del evento sirve para detectar duplicados.

---

## Requisito para aplicar State y Strategy en el Batch

El diagrama C4 indica que el Batch Processor invoca el stored procedure `sp_procesar_debitos_ahorro_programado()`. Para que los patrones anteriores apliquen, el SP solo debe **seleccionar los débitos del día**. Las transiciones de estado, los reintentos y los cálculos deben quedar en el código Java del Batch. Si esa lógica se deja en el SP, los patrones State y Strategy no aplican en el Batch y esa parte queda fuera de la cobertura de pruebas unitarias.
