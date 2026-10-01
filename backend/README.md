# Backend — Billetera de Ahorro

Implementación del contrato [`contracts/openapi.yaml`](../contracts/openapi.yaml) en **Node.js + TypeScript**, como monolito modular por capas (Fase 2) con un proceso por contenedor.

## Procesos

| Proceso | Entrada | Responsabilidad |
|---|---|---|
| Ahorro Core API | `src/apps/api.ts` | Endpoints REST `/v1/...` y relay de la outbox |
| Servicio de Autenticación | `src/apps/auth.ts` | `POST /v1/auth/token`: JWT RS256 (15 min) + refresh token con rotación |
| Batch Processor | `src/apps/batch.ts` | Corte diario de débitos (CronJob) y registro de resultados en el ledger (Worker) |
| Adaptador Core | `src/apps/core-adapter.ts` | Consume `DebitoSolicitado` / `CreditoSolicitado`, llama al Core y publica el resultado |
| Core simulado | `src/apps/core-simulado.ts` | REST sobre el MongoDB Atlas del equipo, con el modelo de `bdd/` (fuera del alcance del producto) |

Infraestructura: **PostgreSQL 16** (datos, ledger, outbox), **RabbitMQ** (eventos), **Kong** (API Gateway) y el **MongoDB Atlas** externo del Core simulado.

## Capas

```
src/
├── domain/          Reglas puras: tarifas, simulación, State (plan y cuota), Strategy (interés y salida del bloqueo), eventos
├── application/     Casos de uso (services/) y puertos (ports/): repositorios, unidad de trabajo, CoreBancarioPort
├── infrastructure/  PostgreSQL, RabbitMQ + outbox relay, Adaptador Core + decoradores, JWT y bcrypt
├── presentation/    Express 5: DTOs (Zod), middlewares, controladores, mappers al contrato, errores RFC 9457
├── apps/            Un punto de entrada por proceso
└── simulador-core/  Core bancario simulado (MongoDB)
```

Las dependencias apuntan hacia adentro: el dominio no conoce Express ni PostgreSQL; los servicios dependen de puertos, y la infraestructura los implementa.

## Dónde está cada patrón

| Patrón | Ubicación |
|---|---|
| Adapter | `infrastructure/core/core-legacy.adapter.ts` y `core-simulado.adapter.ts` implementan `CoreBancarioPort` |
| Decorator | `infrastructure/core/decoradores/`: Retry → Circuit Breaker (opossum) → Logging → Timeout; armado en `fabrica-core.ts` |
| Strategy | `domain/estrategias/`: `CalculoInteresStrategy` y `PoliticaSalidaBloqueoStrategy` |
| State | `domain/plan/estados-plan.ts` (plan) y `domain/cuota/cuota.ts` (cobro: 5 intentos a 24 h) |
| Observer / pub-sub | `domain/eventos.ts`, `infrastructure/messaging/rabbitmq.ts` (colas por tipo de evento + DLQ) |
| Transactional Outbox | `application/services/solicitudes-core.ts` + `infrastructure/messaging/outbox-relay.ts` |
| Consumidor idempotente | `eventos_procesados` en `resultados-core.service.ts` |
| Repository + Unit of Work | `application/ports/repositorios.ts`, `infrastructure/postgres/` |
| Idempotency-Key | `presentation/http/middlewares/idempotencia.middleware.ts` |
| Paginación offset / cursor | `shared/paginacion.ts`, `consultas.service.ts`, `pg-ledger.repository.ts` |
| Ledger de solo inserción | `db/migrations/001_esquema.sql` (trigger) y vista `vw_planes` (saldos derivados) |

## Levantar todo con Docker

```bash
npm install
npm run claves              # genera keys/ (RSA) y kong/kong.yml con la clave pública
cp .env.example .env        # y completar MONGO_URI con la cadena de MongoDB Atlas
docker compose up -d --build
```

`backend/.env` no se versiona. El Core simulado se conecta a Atlas al arrancar y completa los datos de prueba que falten (clientes y cuentas por número, `uuid` público de cada cuenta) **sin borrar ni modificar** lo que ya existe. Atlas debe permitir conexiones desde la IP del equipo o del servidor (Network Access).

- API a través del Gateway: `http://localhost:8000` (HTTPS con TLS 1.3 en `https://localhost:9443`)
- RabbitMQ: `http://localhost:15672` (guest/guest)
- Core simulado: `http://localhost:4000` — `POST /admin/fallas {"porcentaje": 100, "latenciaMs": 0}` simula una caída para ver el Circuit Breaker

Usuarios de prueba (`db/migrations/002_datos_demo.sql`): `pablo.jara@email.com` / `goallet123` (CLIENTE), `operador@billetera.test` / `operador123`, `auditor@billetera.test` / `auditor123`.

```bash
TOKEN=$(curl -s -X POST localhost:8000/v1/auth/token -H 'content-type: application/json' \
  -d '{"grantType":"password","email":"pablo.jara@email.com","contrasena":"goallet123"}' | jq -r .accessToken)
curl -s localhost:8000/v1/cuentas-debito -H "Authorization: Bearer $TOKEN"
```

Corte de débitos manual (por ejemplo, para la fecha de una cuota):

```bash
docker compose exec batch node dist/apps/batch.js --corte 2026-10-15
```

## Pruebas

```bash
npm run test:unit                       # sin dependencias externas
docker compose up -d postgres rabbitmq
npm run coverage                        # unitarias + integración, con reporte en coverage/
```

Las pruebas unitarias usan repositorios en memoria (`test/fakes/`) y el `CoreSimuladoAdapter`; las de integración corren contra PostgreSQL (base `billetera_test`) y RabbitMQ (vhost `pruebas`). Cobertura actual: **97,9 % de líneas** (umbral configurado: 80 %). Se excluyen los puntos de entrada (`src/apps`), verificados con docker compose, y el Core simulado.
