# Resumen de la materia — Patrones de Diseño de APIs (MSOF)

> **Programa:** Maestría en Software — Universidad Politécnica Salesiana (Ecuador), Posgrados
> **Asignatura:** MSOF — Patrones de Diseño de APIs
> **Docente / Autora del material:** Ing. Patsy Malena Prieto, MSc.
> **Fuente:** PDFs de las 4 unidades + deck complementario de Seguridad, en `recursos/`
> **Fecha de elaboración de este resumen:** 21 de septiembre de 2026

Este documento condensa **todo el contenido visto en clase**. Está pensado como archivo de contexto: al iniciar una nueva sesión de trabajo sobre el proyecto final, leer este archivo junto con `TAREA-FINAL.md` da el marco conceptual completo que el docente espera ver aplicado.

---

## Índice

1. [Unidad 1 — Introducción a Sistemas basados en APIs](#unidad-1--introducción-a-sistemas-basados-en-apis)
2. [Unidad 2 — Arquitectura y Patrones para sistemas dirigidos por APIs](#unidad-2--arquitectura-y-patrones-para-sistemas-dirigidos-por-apis)
3. [Unidad 3 — Diseño de APIs](#unidad-3--diseño-de-apis)
4. [Unidad 4 — Desarrollo de sistemas basados en APIs](#unidad-4--desarrollo-de-sistemas-basados-en-apis)
5. [Material complementario — Arquitectura de Seguridad en APIs](#material-complementario--arquitectura-de-seguridad-en-apis)
6. [Caso de estudio recurrente: NeoMarket](#caso-de-estudio-recurrente-neomarket)
7. [Modelo ArchiMate de referencia (`descuentos.archimate`)](#modelo-archimate-de-referencia-descuentosarchimate)
8. [Glosario rápido de siglas](#glosario-rápido-de-siglas)
9. [Bibliografía consolidada](#bibliografía-consolidada)

---

## Unidad 1 — Introducción a Sistemas basados en APIs

**Temas del programa:** ¿Qué es una API? · Objetivos del diseño de las APIs · La anatomía de una API · La naturaleza de las APIs.

### 1.1 Qué es una API — "La columna vertebral digital"

Una API **no es solo código**: es el **mecanismo, el contrato y el puente** que permite la comunicación entre sistemas heterogéneos mediante protocolos definidos. Sus tres aportes:

| Dimensión | Aporte |
|---|---|
| **Integración** | Une ecosistemas aislados. |
| **Estrategia** | Aporta directamente al modelo de negocio corporativo. |
| **Innovación** | Es el motor central de la innovación abierta (Open Banking, GovTech, HealthTech). |

### 1.2 Objetivos del diseño — Las 5 dimensiones

Estas cinco dimensiones son también **la información que la alta gerencia necesita** para aprobar una inversión en APIs:

| Dimensión | Definición técnica | Lectura de negocio |
|---|---|---|
| **Interoperabilidad** | Intercambio fluido de datos entre aplicaciones heterogéneas. | Capacidad estratégica para que distintos sistemas y departamentos intercambien datos automáticamente y los conviertan en decisiones en tiempo real, sin fricciones ni procesos manuales. |
| **Modularidad** | Desacoplamiento total entre frontend, backend y servicios externos. | Permite crear/diseñar una API sin cambiar frontend ni backend. Reduce el *time to market* y blinda la continuidad del negocio. |
| **Escalabilidad** | Crecimiento ágil; añadir servicios sin refactorizar el núcleo. | Permite adoptar nuevas tecnologías (IA, analítica avanzada) de manera inmediata, porque los datos ya están listos y disponibles. |
| **Estandarización** | Protocolos universales (REST, SOAP, GraphQL). | Lenguaje común: cualquier software actual o futuro se conecta con el resto de la empresa de forma inmediata, segura y económica. |
| **Seguridad** | Control estricto de accesos (API Keys, OAuth, JWT). | Herramienta de mitigación de riesgos legales y de reputación corporativa. |

### 1.3 La anatomía de una API

**El viaje de los datos (anatomía de una petición):**

1. **Endpoint (la puerta)** — URL única de entrada (ej. `/clientes`).
2. **Método (la acción)** — `GET`, `POST`, `PUT`, `DELETE`.
3. **Recurso y Parámetros (el objeto)** — entidades procesadas y filtros (path, query, body).
4. **Autenticación (el guardia)** — validación de identidad (OAuth, JWT).
- Transversal: **Formato** (JSON / XML), **Códigos de estado** (200 OK, 404 Not Found, 500 Error), **Documentación** (OpenAPI / Swagger).

**Anatomía completa por capas (8 capas):**

| # | Capa |
|---|---|
| 1 | Endpoints (URLs) |
| 2 | Métodos (GET, POST, PUT, DELETE) |
| 3 | Recursos (entidades y colecciones) |
| 4 | Parámetros (path, query, headers, body) |
| 5 | Formato de datos (JSON, XML) |
| 6 | Códigos de estado (200, 404, 500) |
| 7 | **Autenticación / Autorización** |
| 8 | Documentación (OpenAPI) |

### 1.4 La naturaleza de las APIs — Las 4 dimensiones del contrato digital

| Naturaleza | Significado |
|---|---|
| **Intermediarias** | Actúan como puente; facilitan la comunicación entre sistemas heterogéneos sin importar lenguaje, arquitectura o ubicación. |
| **Abstractas** | Ocultan la complejidad interna. El consumidor no necesita saber cómo funciona el servicio por dentro, solo cómo invocarlo. |
| **Contractuales** | Definen reglas claras (entradas esperadas y salidas posibles). Aseguran consistencia entre clientes y proveedores. |
| **Evolutivas** | Se adaptan sin romper integraciones existentes, mediante uso estricto de versionamiento. |

### 1.5 De microservicios a la macro-economía: los 3 ecosistemas de mercado

Al estandarizar contratos y resolver seguridad/escalabilidad, las APIs permiten exponer activos de TI de forma controlada, rompiendo barreras organizacionales.

| | **Interno** | **Partners** | **Público** |
|---|---|---|---|
| **Audiencia destino** | Empleados y equipos propios | Aliados comerciales B2B | Terceros y comunidad externa |
| **Objetivo estratégico** | Eficiencia operativa y modularidad | Interoperabilidad y nuevos canales | Innovación acelerada y escala |
| **Nivel de restricción** | Bajo (red interna aislada) | Alto (contratos formales y OAuth) | Moderado (autoservicio, API Keys, cuotas) |
| **Casos prácticos** | Netflix Microservicios | Expedia, MercadoPago B2B, PayPal | API Verónica SRI, Google Maps, NASA |

- **Ecosistema Interno (agilidad organizacional):** APIs privadas para desarrolladores de la misma organización. Valor core: modularidad, reutilización de código y separación limpia Frontend/Backend.
- **Ecosistema de Socios (integración B2B):** APIs compartidas con aliados bajo acuerdos comerciales y técnicos estrictos. Requiere altos estándares de seguridad (OAuth) y contratos explícitos.
- **Ecosistema Público (innovación abierta / Open API):** APIs abiertas al mercado global. Maximiza el autoservicio → exige documentación impecable y escalabilidad masiva.

### 1.6 Modelos de monetización de APIs

**Modelos de consumo directo**
- **Pago por uso (Pay-as-you-go / Tokens):** el coste se basa en el consumo exacto de recursos o unidades de datos.
- **Freemium:** acceso gratuito con límites (ej. los 5 USD de crédito inicial de ChatGPT).
- **Suscripciones por niveles (Tiered):** precios escalonados según volumen de peticiones o funcionalidades (Básico / Medio / Avanzado).

**Modelos indirectos y mixtos**
- **Participación en ingresos (Revenue Share):** comisión por cada transacción procesada (típico de PayPal).
- **Monetización indirecta:** la API no cobra directamente pero impulsa la adopción de los servicios principales.
- **Modelos híbridos:** cuota fija mensual + cargos por exceso de uso.

> **Ejemplo real — OpenAI (monetización directa):** unidad de cobro por cada 1.000 tokens consumidos; incentivo inicial de 5 USD en crédito gratuito (primeros 3 meses); flexibilidad de pago exclusivo por uso realizado.

### 1.7 Casos de estudio de la Unidad 1

- **Open Banking:** cuando la API transforma una industria cerrada en plataforma de innovación abierta. Flujo: **Banco (infraestructura core)** → **API Gateway (el puente seguro: OAuth 2.0 / JWT + consentimiento explícito del usuario)** → **Ecosistema Fintech (finanzas personales, pasarelas de pago, análisis de crédito)**. La seguridad y la estandarización (REST/JSON) hacen posible este modelo descentralizado de confianza cero.
- **Facturación electrónica en LatAm (caso Verónica SRI):** la API como intermediaria entre sistemas heterogéneos y entes reguladores; naturaleza abstracta (oculta la complejidad fiscal); endpoints estandarizados (ej. `/api/v2.0/comprobantes/facturas`); códigos esenciales: `200 OK` (factura procesada), `201 Created` (comprobante generado), `400/500` (error en datos o fallo del servidor tributario).
- **Netflix:** venció la fragmentación de dispositivos (Smart TVs, consolas, móviles, web) con un ecosistema de APIs internas. Abstracción de la complejidad + optimización de la entrega de contenido.

### 1.8 Matriz de gestión del ciclo de vida de una API

| | **Fase 1: Diseño** | **Fase 2: Evolución** | **Fase 3: Retiro** |
|---|---|---|---|
| **Objetivo principal** | Establecer un contrato estandarizado y autoservicio | Añadir valor y escalar sin romper integraciones | Reducir deuda técnica y cerrar accesos de forma segura |
| **Enfoque de la documentación** | Definición estricta de endpoints, métodos y seguridad | Documentación paralela de v1 y v2, guías de migración | Marcado explícito de endpoints como *deprecated* |
| **Códigos de estado clave** | 200 OK, 201 Created, 400 Bad Request | 200 OK, 301 Moved Permanently | 410 Gone, 404 Not Found |
| **Impacto en el consumidor** | Curva de adopción inicial e integración | Convivencia de versiones y planificación de migración | Migración forzada o desconexión del servicio heredado |

---

## Unidad 2 — Arquitectura y Patrones para sistemas dirigidos por APIs

**Temas del programa:** Arquitecturas de software orientadas a APIs · Patrones de diseño de software orientados a APIs.

### 2.1 Qué es arquitectura de software

- Es un **proceso fundamental**, "un viaje sin destino": debe permitir que el sistema cambie y se adapte incrementalmente en el tiempo, para responder a nuevas tecnologías y requisitos del negocio.
- Definición clave: se centra en **las decisiones que son importantes y difíciles de cambiar**.
- Una buena arquitectura promueve **bajo acoplamiento** (los componentes no dependen estrechamente unos de otros) y **alta cohesión** (los elementos dentro de un componente están relacionados lógicamente). Esto hace los sistemas más fáciles de entender, mantener y modificar.

### 2.2 Capas de una arquitectura orientada a APIs

| Capa | Responsabilidad |
|---|---|
| **Presentación (interfaz de usuario)** | Interactúa directamente con el usuario: muestra información y recopila comandos del cliente. |
| **Aplicación** | Alberga la lógica de negocio y define el funcionamiento de la API. Procesa solicitudes, ejecuta operaciones y orquesta el comportamiento general. Es el núcleo funcional. |
| **Integración** | Facilita la interoperabilidad gestionando la integración entre sistemas y servicios: transformación de datos y validación, asegurando flujo continuo. Se ubica entre la capa de datos y la de aplicación. |
| **Acceso a datos** | Interactúa con el almacenamiento: operaciones CRUD (crear, leer, actualizar, eliminar). |

### 2.3 Tipos de estilos arquitectónicos

Catálogo visto en clase: **Monolítica · SOA · REST · Microservicios · Event-Driven · gRPC · Serverless/FaaS expuesto vía APIs**.

- **Monolítico expuesto por APIs:** aplicación única que expone su funcionalidad vía REST/GraphQL. *Ventaja:* simplicidad inicial, un solo despliegue. *Limitación:* escalabilidad y evolución limitadas; cambios en la API afectan todo el monolito.
- **RESTful:** usa HTTP como protocolo principal; recursos (usuarios, productos, pedidos) representados en JSON; patrón `URI = recurso`; independiente de la plataforma (web, móvil, IoT).
- **Microservicios dirigidos por APIs:** cada servicio es autónomo con su propia base de datos y API; el **API Gateway centraliza la entrada**. *Ventaja:* escalabilidad, resiliencia, despliegues independientes. *Limitación:* complejidad operativa (observabilidad, fallos distribuidos, seguridad).
- **Event-Driven APIs:** los servicios publican y consumen eventos (Kafka, RabbitMQ, Webhooks, SSE, gRPC streaming). *Ventaja:* desacoplamiento, escalabilidad, tiempo real. *Limitación:* complejidad en consistencia eventual y orden de eventos.
- **gRPC** y **Serverless/FaaS expuesto vía APIs** (ver detalle en el playbook de decisiones, § 2.5).

### 2.4 El diseño arquitectónico es el arte del trade-off

- **No existe la bala de plata:** toda decisión tecnológica implica sacrificar un atributo de calidad en favor de otro. **El contexto dicta la elección.**
- **ISO/IEC 25010 como brújula analítica:** cada paradigma se evalúa empíricamente por su latencia, nivel de acoplamiento, seguridad y consumo de infraestructura.
- **El ecosistema híbrido:** los sistemas complejos modernos (e-commerce, IoT) **no eligen una sola arquitectura**: orquestan múltiples estilos simultáneamente según el dominio específico del problema.

#### Modelo de calidad ISO/IEC 25010 (8 características)

| Grupo | Característica | Descripción |
|---|---|---|
| Operación y experiencia de usuario | **Idoneidad funcional** | Grado en que el producto proporciona funciones que satisfacen necesidades declaradas e implícitas. |
| | **Eficiencia de rendimiento** | Relación entre el nivel de rendimiento y la cantidad de recursos utilizados. |
| | **Usabilidad** | Facilidad de aprendizaje, operabilidad, protección ante errores, accesibilidad. |
| | **Fiabilidad** | Mantener el nivel de rendimiento bajo condiciones establecidas. Sub: madurez, disponibilidad, tolerancia a fallos, recuperabilidad. |
| Seguridad y evolución técnica | **Seguridad** | Protección de información y datos frente a accesos no autorizados. Sub: confidencialidad, integridad, autenticidad, responsabilidad. |
| | **Mantenibilidad** | Facilidad de modificar, corregir o mejorar. Sub: modularidad, reutilización, analizabilidad, modificabilidad. |
| | **Compatibilidad** | Capacidad de dos o más sistemas para intercambiar información o realizar sus funciones compartiendo hardware. |
| | **Portabilidad** | Facilidad de transferir el software de un entorno a otro. |

### 2.5 Playbook de decisiones: estilos arquitectónicos modernos

Cada estilo se presentó con **Filosofía / Caso práctico / Trade-off (ventaja vs. costo)**.

| Estilo | Stack | Filosofía | Ventaja | Costo |
|---|---|---|---|---|
| **REST** | HTTP/1.1, JSON, OpenAPI/Swagger | Diseño orientado a recursos identificados por URIs uniformes y manipulados con verbos HTTP estandarizados. Estándar de facto para APIs públicas. | Excelente facilidad de cacheo distribuido (nativo a nivel HTTP: `Cache-Control`, Varnish, CDNs). | Latencia media por payloads JSON pesados (texto plano) y posible **over-fetching**. |
| **GraphQL** | `POST /graphql`, SDL | El cliente dicta la estructura exacta de la respuesta mediante un endpoint único. Erradica over-fetching y under-fetching. | Optimización drástica de la red y autonomía total para los equipos de Frontend. | Transfiere la carga computacional al servidor (CPU por parseo de consultas dinámicas). Se pierde el cacheo nativo de red al usar siempre HTTP POST. |
| **gRPC** | HTTP/2, Protobuf, binario | Framework RPC de alto rendimiento de Google. Abandona el texto plano en favor de Protocol Buffers (serialización binaria compacta) sobre HTTP/2. | Latencia ultra-baja y rendimiento excepcional para arquitecturas internas de alta densidad. | Alto acoplamiento contractual: requiere generación, compilación y distribución estricta de stubs (SDKs) entre cliente y servidor. |
| **EDA (Event-Driven)** | Asíncrono, Kafka/RabbitMQ, AsyncAPI | Producción, detección y consumo de eventos de estado a través de un broker intermediario. Los productores emiten sin saber quién consumirá ni cuándo. | Escalabilidad extrema con capacidad nativa para absorber picos masivos de tráfico imprevisto. | Depuración altamente compleja. Exige Distributed Tracing y alta probabilidad de comportamientos emergentes. |
| **WebSockets** | TCP, Full-Duplex, `Upgrade: websocket` | Protocolo TCP permanente iniciado con un upgrade HTTP. Canal único, **stateful**, abierto en ambas direcciones. Cero overhead de reconexión. | Comunicación casi instantánea en milisegundos. | Alto consumo de infraestructura: sockets abiertos en RAM. Escalar requiere buses inter-nodo (ej. Redis Pub/Sub). Riesgo de seguridad **CSWSH**. |
| **WebHooks** | HTTP POST, unidireccional, stateless | El paradigma "no me llames, yo te llamo": el servidor genera activamente peticiones HTTP POST salientes hacia una URL pública del cliente. | Altamente escalable, efímero y stateless (libera recursos inmediatamente en el emisor). | Seguridad perimetral crítica en el receptor: obliga a firmas criptográficas (ej. `X-Hub-Signature`) para validar la autenticidad del emisor. |
| **Serverless / FaaS** | API Gateway, micro-funciones, efímero | Lógica de negocio fragmentada en micro-funciones atómicas, acopladas al ciclo de vida de un evento HTTP o disparador vía API Gateway. Escalabilidad instantánea e infinita. | Cero gestión de infraestructura subyacente. Costo proporcional al uso exacto. | Latencia por **cold starts** y altísimo nivel de **vendor lock-in**. |

#### Análisis de fricción: rendimiento vs. acoplamiento

> **Regla constante de la física de sistemas distribuidos:** a mayor velocidad síncrona y optimización de red requerida (ej. gRPC), mayor compromiso contractual y rigidez exigimos de nuestros clientes y desarrolladores.

Posición en el plano (eje X = acoplamiento contractual, eje Y = rendimiento/latencia): `EDA` (mínimo) → `WebHooks` → `REST & GraphQL` → `WebSockets` → `gRPC` (alto estricto).

#### Matriz de evaluación ISO/IEC 25010 por estilo

| Atributo | REST | GraphQL | gRPC | EDA | FaaS | WebSockets | WebHooks |
|---|---|---|---|---|---|---|---|
| Facilidad de cacheo | Alto | Bajo | Bajo | N/A | Medio | N/A | N/A |
| Escalabilidad concurrente | Medio | Medio | Alto | Alto | Alto | Bajo | Alto |
| Mantenibilidad de código | Alto | Medio | Medio | Bajo | Bajo | Bajo | Alto |
| Seguridad perimetral | Medio | Bajo | Alto | Medio | Alto | Medio | Bajo |

Conclusiones: **REST** domina en resiliencia de lectura mediante cacheo de red nativo · **EDA** triunfa en absorción de concurrencia pero penaliza drásticamente la trazabilidad · **WebSockets** ofrece latencia inigualable pero rompe los patrones tradicionales de escalabilidad horizontal.

#### El dilema del tiempo real: WebSockets vs. WebHooks

| | **WebSockets (flujo continuo)** | **WebHooks (evento discreto)** |
|---|---|---|
| Direccionalidad | Full-Duplex (paralelo) | Unidireccional (server-to-client push) |
| Infraestructura | Stateful (sockets persistentes en RAM) | Stateless (ejecuta el POST, recibe 200 OK y libera recursos) |
| Escalabilidad | Compleja (no admite balanceadores simples; requiere Pub/Sub inter-nodo) | Alta (HTTP común con colas de reintentos y backoff) |

> **Veredicto:** WebSockets **exclusivamente** para flujos de datos continuos (streams IoT, chat en vivo). WebHooks para notificaciones asíncronas de eventos puntuales y discretos (pagos, cambios de estado).

#### Árbol de decisiones de interacción de datos

```
¿Comunicación interna entre microservicios de alta densidad y baja latencia?
  └─ Sí → usa gRPC
  └─ No ↓
¿Hay picos masivos de transacciones impredecibles que saturen la DB?
  └─ Sí → desacopla con EDA (Kafka)
  └─ No ↓
¿Necesitas telemetría bidireccional continua y viva?
  └─ Sí → usa WebSockets
  └─ Solo notificar eventos puntuales → usa WebHooks
  └─ No aplica ↓
¿Es consumo frontend donde la UI requiere datos jerárquicos complejos?
  └─ Sí → despliega un BFF con GraphQL
  └─ No, es integración externa estándar → apégate a REST (OpenAPI)
```

#### Principios fundamentales del diseño distribuido

1. **El contrato dicta la velocidad.** La forma en que produces y validas contratos (OpenAPI, Protobuf, AsyncAPI) determinará la agilidad de tus equipos más que la tecnología subyacente.
2. **Abraza el aislamiento temporal.** En sistemas a gran escala, asume la falla. Tecnologías asíncronas (EDA, WebHooks) previenen fallos en cascada al aislar en tiempo y espacio a emisores de receptores.
3. **La complejidad no se destruye, se transfiere.** GraphQL facilita la experiencia del Frontend transfiriendo el peso al CPU del Backend. gRPC maximiza el rendimiento sacrificando la mantenibilidad del código.

> *"La arquitectura óptima es aquella donde los sacrificios realizados están alineados con el modelo de negocio."*

### 2.6 Patrones de diseño orientados a APIs

**¿Qué es un patrón de diseño?** Soluciones reutilizables para problemas comunes en la construcción, publicación y consumo de APIs. Establecen buenas prácticas que mejoran consistencia, escalabilidad, seguridad y experiencia del consumidor. Se aplican tanto a nivel de arquitectura como de implementación. Sin patrones, cada equipo resolvería los problemas de forma distinta, generando inconsistencia, inseguridad y dificultad de mantenimiento.

**Catálogo base de la unidad:** API Gateway · Service Registry · BFF · CQRS · Circuit Breaker.

| Patrón | Descripción |
|---|---|
| **API Gateway** | Herramienta de gestión crítica en el "borde" (edge). Único punto de entrada que media entre consumidores (apps móviles, navegadores, terceros) y una colección de servicios backend. Actúa como **proxy inverso**: acepta todas las solicitudes, las dirige a los servicios apropiados, agrega los resultados y devuelve la respuesta. |
| **Service Registry** | Patrón fundamental en microservicios que permite el **descubrimiento dinámico de servicios** y reduce la dependencia de configuraciones estáticas. Catálogo centralizado donde los microservicios se registran al iniciarse, proporcionando su ubicación (IP y puerto). Al comunicarse, un servicio consulta el registro para encontrar dirección y estado de las instancias disponibles. |
| **BFF (Backend for Frontend)** | Un servicio backend **dedicado para cada cliente frontend** (web, móvil, escritorio) en lugar de una API monolítica que sirva a todos. Capa intermedia que adapta y filtra los datos de los servicios centrales según las necesidades de cada interfaz. *Ventaja:* experiencia optimizada por dispositivo, clientes más simples. *Limitación:* multiplicación de backends que mantener. |
| **CQRS** | *Command Query Responsibility Segregation.* Separa las operaciones de escritura (comandos) de las de lectura (consultas), permitiendo optimizar, escalar y gestionar cada parte de forma independiente. Usado en aplicaciones de alto rendimiento: p. ej. NoSQL para lecturas (más rápida al recuperar) y SQL para comandos (inserción, actualización, borrado). |
| **Circuit Breaker** | Técnica de resiliencia que funciona como interruptor automático de seguridad. **Previene fallos en cascada** monitoreando el estado de un servicio; si detecta fallos repetidos interrumpe temporalmente la comunicación para evitar agotar recursos. Tres estados: **Cerrado** (opera normal), **Abierto** (falla y se detiene), **Semiabierto** (permite pruebas para ver si el servicio se recuperó). |

### 2.7 El marco de solución: 3 pilares de patrones

| Pilar 1 — Resiliencia y estabilidad | Pilar 2 — Consumo y optimización | Pilar 3 — Persistencia y estado |
|---|---|---|
| Circuit Breaker · Retry & Rate Limiting | BFF (Backend For Frontend) · API Composition | CQRS · Event Sourcing |

#### Pilar 1 — Resiliencia y estabilidad
*Proteger el API Gateway contra el agotamiento de hilos (thread starvation) y las fallas en cascada.*

- **Circuit Breaker (el disyuntor):** máquina de estados `Closed → (umbral: 50% errores / 10 s) → Open → Half-Open → Closed`. *Mecánica:* intercepta fallos; al superar el umbral bloquea el tráfico al instante devolviendo una respuesta degradada (caché) para salvar el API Gateway.
- **Retry — evitando el efecto estampida (thundering herd):** los reintentos simultáneos colapsan la red. *Mecánica:* **Backoff exponencial + Jitter** (retrasos automáticos crecientes más un factor aleatorio) para distribuir la carga de recuperación (1 s → 2 s → 4 s).

#### Pilar 2 — Consumo y optimización
*Desbloquear el rendimiento del frontend y eliminar el over-fetching en entornos omnicanal.*

- **BFF:** capas de API exclusivas por cliente. El BFF Web entrega 20 campos (server-side rendering); el BFF Móvil entrega 5. El equipo móvil controla limpieza, compresión y reducción de payloads.
- **API Composition:** una sola petición del cliente; el orquestador (API Gateway) **paraleliza internamente** las llamadas a Catálogo / Reviews / Inventario y une las respuestas (*join*) en un único JSON, eliminando 3 round-trips por Internet.

#### Pilar 3 — Persistencia y estado
*Desacoplar lecturas de escrituras y garantizar una auditoría matemática perfecta bajo alta concurrencia.*

- **CQRS:** separación física de modelos. Escritura/Comandos en **PostgreSQL / MongoDB** (optimizado para transacciones, "el botón Comprar"); Lectura/Consultas en **Redis / Elasticsearch** (optimizado para búsquedas masivas, "ver catálogo"). Sincronización por **consistencia eventual / eventos asíncronos**. Lecturas y escrituras escalan de forma completamente independiente.
- **Event Sourcing (el historial inmutable):** el estado **no se sobrescribe, se calcula**. Se almacena la secuencia inmutable de eventos (`[Afiliado Registrado] → [Comisión +$50] → [Retiro −$10] → [Comisión +$410] = Saldo actual $450`). El saldo final es una proyección matemática.

| | **Tradicional (CRUD)** | **Event-Driven (CQRS + ES)** |
|---|---|---|
| **Estado** | Sobrescribe el estado anterior (pérdida de historia) | Añade eventos inmutables al log (append-only) |
| **Rendimiento** | Lecturas y escrituras compiten por recursos | Lecturas desnormalizadas asíncronas ultra-rápidas |
| **Auditoría** | Requiere tablas de log separadas e imperfectas | Auditoría matemática perfecta por diseño (fuente de verdad) |

#### Matriz de diagnóstico de patrones API

| Síntoma observado | Patrón recomendado | Resultado esperado |
|---|---|---|
| Cascadas de error por validaciones lentas | **Circuit Breaker** | Fallo rápido, protege el pool de hilos |
| Caídas por picos de reintentos simultáneos | **Retry + Jitter** | Carga distribuida en el tiempo |
| Dispositivos móviles descartando grandes payloads | **BFF** | Payloads quirúrgicos por cliente |
| Alta latencia por múltiples llamadas HTTP | **API Composition** | Paralelización en red interna |
| Consultas lentas por bloqueos transaccionales | **CQRS** | Escalabilidad de lectura independiente |

---

## Unidad 3 — Diseño de APIs

**Temas del programa:** La cadena de valor de las APIs · Alineación del diseño de las APIs con los objetivos empresariales · Diseño del modelo orientado a APIs · Modelo de datos orientado a API.

### 3.1 De conectores técnicos a productos digitales

| **El paradigma tradicional** | **El paradigma de producto** |
|---|---|
| Las APIs no tienen valor inherente por sí solas. Son meros conectores. | Las APIs aportan enorme valor al liberar los activos y funcionalidades críticas. **Son la puerta de entrada para los clientes.** |

**Data Supply Chain:** `Systems of Record (sistemas legados y bases de datos)` → `Capa de Integración / API Gateway` → `Systems of Engagement (aplicaciones, Open Banking, partners)`.

### 3.2 La cadena de valor de las APIs: de la conectividad a la monetización

Progresión por tres niveles de madurez (**táctico → estratégico → diferenciación**):

| Nivel de supervivencia (táctico) | Ventaja competitiva (estratégico y diferenciación) |
|---|---|
| **Conectividad de sistemas** — integración esencial entre aplicaciones Cloud, On-premise y sistemas heredados como ERP o CRM.<br>**Productividad y movilidad empresarial** — APIs multidisciplina para mejorar la eficiencia operativa de los empleados. | **Habilitación omnicanal** — APIs orientadas al consumidor final (B2C) para web, móvil, redes sociales y canales directos.<br>**Colaboración con socios y monetización** — transición de integraciones B2B hacia la generación directa de ingresos.<br>**Máximo valor de negocio** — punto culminante donde las APIs se convierten en activos financieros estratégicos. |

### 3.3 Alineación top-down: la pirámide estratégica de 6 capas

| Capa | Contenido |
|---|---|
| 1. **Business Goals** | Metas corporativas globales. |
| 2. **Business Architecture** | Funciones y procesos de negocio. |
| 3. **Application Architecture** | Cómo el software habilita el proceso (el puente técnico). |
| 4. **Technical Architecture** | Infraestructura y hardware base. |
| 5. **API QoS** | Gobernanza, seguridad, rate-limiting (acuerdos de servicio). |
| 6. **API Definition** | Estilos de interfaz y modelos de datos físicos. |

> **Regla de oro:** un fallo en la base técnica (ej. latencia descontrolada) destruye irremediablemente el impacto en el negocio superior. **El diseño impacta desde el desarrollador hasta el nivel ejecutivo.**

### 3.4 Diseñando la propuesta de valor de la API

| **Mapa de valor de la API** | **Perfil del usuario** |
|---|---|
| **Características:** infraestructura de comunicaciones en tiempo real. | **Tareas:** automatizar alertas, sincronizar datos clave. |
| **Aliviadores:** reintentos automáticos de conexión, alta disponibilidad. | **Frustraciones:** fallos en la entrega, baja fiabilidad, pérdida de tiempo. |
| **Creadores de valor:** SDKs de rápida integración, webhooks configurables. | **Alegrías:** disparar acciones automáticas, integración instantánea. |

> **Caso Lingo24:** identificaron dos perfiles de usuario y crearon dos ofertas diferenciadas (Business Document API vs. Premium Machine Translation API) unificadas bajo un mismo portal, alineando su arquitectura con la necesidad exacta del cliente.

### 3.5 Modelos de negocio: más allá del pago por uso

Matriz **Generación de Valor (directo/indirecto) × Audiencia (interna/externa)**:

| | **Interna** | **Externa / Pública** |
|---|---|---|
| **Directo** | Retención y nuevos canales (móvil / web) | Pago directo (SaaS / monetización) |
| **Indirecto** | Innovación y agilidad interna (microservicios) | Crecimiento de ecosistemas (B2B / partners) |

> **El pivot de Netflix:** fue pionero lanzando un programa de API pública. En **2013** cerró el programa público porque no aportaba valor significativo a su modelo de negocio central, y reorientó el poder de las APIs hacia uso interno, creando una de las arquitecturas de microservicios más exitosas del mundo.
>
> **Lección: el éxito de una API se mide por su alineación al negocio, no por su apertura.**

### 3.6 Taxonomía técnica: selección del estilo arquitectónico

| | **REST** | **gRPC (Protocol Buffers)** | **EDA (Arquitecturas dirigidas por eventos)** |
|---|---|---|---|
| **Filosofía base** | Madurez de Richardson, diseño orientado a recursos, hipermedios (HATEOAS). | Comunicación binaria estricta, streaming bidireccional y alto rendimiento. | Procesos asíncronos, publicador-suscriptor y componentes desacoplados. |
| **Caso de uso ideal** | Integración pública, consumo de interfaces web/móviles. | Comunicación interna Service-to-Service optimizada. | Webhooks, AsyncAPI, reactividad a gran escala. |

> **Nota de diseño — API-First:** el contrato de la API (OpenAPI, `.proto`, AsyncAPI) es **la única fuente de verdad compartida entre equipos antes de escribir una sola línea de código.**

### 3.7 Modelo de datos orientado a API: optimización de datos y payloads

**Paginación a gran escala**
- **Offset-based** (`?offset=&limit=`): problemático a escala — el *offset skip* genera carga pesada en la base de datos.
- **Cursor-based** (`?cursor=ID:1234`): óptimo para rendimiento — recuperación rápida.

**Consistencia y agregación**
- Frente a la **dispersión de microservicios**, el **BFF / API Gateway** entrega un **payload unificado y optimizado para el cliente**.

### 3.8 El viaje de adopción: maximizando la experiencia del desarrollador (DX)

| Hito | Definición | Requiere | Riesgo |
|---|---|---|---|
| **TTFHW** — *Time To First Hello World* (corto plazo) | Tiempo que tarda un desarrollador en registrarse y ejecutar su primera llamada exitosa a la API. | Registro sin fricción, documentación interactiva y acceso inmediato a entornos de prueba. | Retrasar el "momento de éxito" provoca el abandono inmediato. |
| **TTFPA** — *Time To First Profitable App* (largo plazo) | Tiempo que toma llevar la integración a producción y generar valor real de negocio. | Soporte robusto, SLAs claros, ejemplos de código end-to-end y estabilidad operativa. | — |

### 3.9 Arquitectura de un Developer Program

```
                        ┌──── Acceleration ────┐
    ┌───────────┬───────┴──────────────────────┴───────┬────────────────┐
    │ Developer │        Community building            │   Pilots /     │
    │  portal   ├──────────┬────────┬──────────────────┤  Case studies  │
    │           │Evangelist│ Events │Comms,social media│                │
    └───────────┴──────────┴────────┴──────────────────┴────────────────┘
    ┌──────────────────────────── Measure ─────────────────────────────┐
```

### 3.10 El radar operativo: balanceando el rendimiento

Cinco ejes y sus **controles tácticos internos**:

| Eje | Significado | Control táctico |
|---|---|---|
| **Dependability** | Fiabilidad | Caching |
| **Flexibilidad** | Opciones técnicas y de negocio | Throttling |
| **Calidad** | Cumplimiento de SLAs | Versionamiento |
| **Velocidad** | Latencia y throughput | Control de acceso |
| **Costo** | Eficiencia y valor | Caching |

> A mayor flexibilidad técnica ofrecida al desarrollador externo, mayor es el esfuerzo, la complejidad y el costo operativo que la organización debe soportar internamente.

### 3.11 Gestión del cambio: la promesa de estabilidad

| **Cambios disruptivos (Breaking Changes)** | **Cambios no disruptivos (Non-Breaking Changes)** |
|---|---|
| *Ejemplos:* eliminación de métodos, alteraciones en tipos de retorno. | *Ejemplos:* nuevos métodos, aumento de parámetros de forma aditiva. |
| *Regla de ejecución:* requiere un salto de versión mayor (v1 → v2). | *Regla de ejecución:* incremento de versión menor, sin interrupción. |
| *Proceso:* exige un plan formal de migración y advertencias tempranas obligatorias a los consumidores. | *Proceso:* despliegue transparente con garantía de compatibilidad hacia atrás. |

> **La filosofía de Stripe:** las integraciones rotas se miden en dólares perdidos. Manejan el cambio de forma invisible **anclando al usuario a la versión específica de la API del día de su registro**, garantizando un contrato técnico inquebrantable a lo largo del tiempo.

### 3.12 Síntesis: el ecosistema API de alto rendimiento

Intersección de tres círculos:

- **Alineación estratégica** — conexión clara entre objetivos comerciales y técnicos.
- **Experiencia del desarrollador** — fricción cero desde el "Hello World" hasta producción.
- **Operaciones robustas** — rendimiento, fiabilidad y gestión del cambio invisible.

> Una tecnología excepcional fracasará sin un modelo de negocio. Un gran modelo colapsará con mala experiencia de desarrollador. **Las verdaderas APIs de clase mundial exigen maestría en las tres dimensiones.**

---

## Unidad 4 — Desarrollo de sistemas basados en APIs

**Temas del programa:** Autorización y autenticación · Implementación de servicios · Pruebas unitarias · Pruebas de stress · Despliegue de APIs.

### 4.1 El ciclo de vida de una API de grado de producción

`1. Seguridad` (autenticación, autorización y JSON Web Tokens) → `2. Implementación` (principios RESTful, OpenAPI vs. gRPC, versionamiento) → `3. Testing` (cuadrantes, pirámides y contratos) → `4. Despliegue` (infraestructura de tráfico y estrategias de liberación).

### 4.2 Autenticación vs. Autorización

| **Autenticación (AuthN) — "quién eres"** | **Autorización (AuthZ) — "qué puedes hacer"** |
|---|---|
| Proceso por el cual un usuario o dispositivo se identifica de forma inequívoca. Es el **primer paso**; puede utilizarse como factor para decisiones posteriores. | Acto de permitir o denegar a usuarios y dispositivos los derechos de acceso a determinados recursos de la red. Valida permisos y nivel de acceso del cliente ya autenticado. |

### 4.3 Modelos de control de acceso

**Autenticación (mecanismos)**

| Mecanismo | Descripción |
|---|---|
| **Básica (Basic Auth)** | Envío de credenciales codificadas en Base64. **Insegura si no se emplea HTTPS.** |
| **Token-Based (JWT)** | Tokens firmados digitalmente para sesiones sin estado (*stateless*). |
| **Federada (OAuth2 / OIDC)** | Delegación de identidad hacia proveedores externos (ej. Google, Microsoft). |

**Autorización (aplicación)**

| Modelo | Descripción |
|---|---|
| **Roles (RBAC)** | Conjunto de permisos agrupados por perfil predefinido. |
| **Scopes** | Límites de acceso específicos para operaciones (lectura, escritura, admin). |
| **Policies (ABAC)** | Reglas dinámicas basadas en contexto o atributos del usuario o entorno. |

### 4.4 Anatomía de un JSON Web Token (JWT)

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 . eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6... . SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
└────────── Header ──────────────────┘   └────────── Payload (Claims) ──────┘   └──────────── Signature ──────────────────┘
```

| Parte | Contenido |
|---|---|
| **Header** | Tipo de token (`"typ": "JWT"`) y algoritmo de firma/cifrado utilizado (ej. HS256). |
| **Payload (Claims)** | Datos que identifican al usuario. Se dividen en **Registrados** (estándar IANA), **Públicos** (definidos sin colisiones) y **Privados** (datos propios de la app). |
| **Signature** | Hash generado a partir del header y el payload, diseñado para validar la autenticidad y prevenir alteraciones. |

### 4.5 OpenID Connect (OIDC) y delegación de identidad

OIDC es una **capa de identidad sobre OAuth 2.0**. Utiliza un esquema REST y JSON para verificar identidades y obtener perfiles.

```
Client                                              Server (Authorization Endpoint & Token Endpoint)
  │──1. Authentication & Authorization Request────────────────→│
  │←─2. Authentication/Authorization (User)────────────────────│
  │←─3. Authorization Code─────────────────────────────────────│
  │──4. Token Request─────────────────────────────────────────→│
  │←─5. ID Token, Access Token─────────────────────────────────│
```

> **Regla crítica de arquitectura:** OIDC proporciona **identidad**, pero no acceso directo. Los **ID Tokens** (claims sobre el usuario) **NUNCA** deben utilizarse como sustitutos de los **Access Tokens** para acceder a recursos protegidos.

### 4.6 Principios de implementación RESTful

**Fundamentos / características core**
- Un servicio API debe ser **idempotente, predecible y autodescriptivo**.
- El enfoque debe ser **"Contract-First"** (diseño antes de implementación).
- **Validación rigurosa** de entradas y salidas para integridad de datos.

**Modelado de recursos — Nouns, not verbs**
Regla: usar **sustantivos (recursos), no verbos (acciones)**. Siempre en plural.

| ❌ Mal | ✅ Bien |
|---|---|
| `POST /crearPaciente` | `POST /pacientes` |
| `GET /obtenerCita/123` | `GET /citas/123` |

### 4.7 Versionamiento semántico (SemVer) — `v2.1.4`

| Componente | Significado |
|---|---|
| **Major** (`2`) | **Cambio no compatible.** Rompe la compatibilidad anterior. Requiere acción del consumidor (ej. guía de migración). |
| **Minor** (`1`) | **Cambio aditivo.** Introduce nuevas características de forma retrocompatible (*backward compatible*). El cliente no necesita cambiar código. |
| **Patch** (`4`) | **Corrección de errores.** Cambios internos exclusivos para solucionar bugs en la funcionalidad existente. |

### 4.8 Cheat sheet: buenas prácticas de implementación

| Categoría | Recomendación |
|---|---|
| **Rutas** | Usar nombres claros y plurales (`/pacientes`). |
| **Respuestas** | Utilizar códigos HTTP estándar (200, 201, 404, 500). |
| **Errores** | Manejar excepciones de forma centralizada (*middleware*). |
| **Paginación** | Implementar parámetros estandarizados (`?page` y `?limit`). |
| **Logs** | Registrar operaciones CRUD, errores y tiempos de respuesta. |
| **Seguridad** | Validar el JWT y aplicar **scopes granulares por recurso**. |
| **Estilo** | Documentar rigurosamente con OpenAPI para mantener consistencia semántica. |

### 4.9 Especificación de contratos: OpenAPI vs. gRPC

| **OpenAPI Specification (OAS)** | **gRPC (Remote Procedure Call)** |
|---|---|
| Mecanismo estándar para describir APIs REST. | Diseñado para APIs de comunicación de alto rendimiento. |
| Basado en formatos legibles por humanos: **JSON o YAML**. | Basado en esquemas estrictos mediante archivos **`.proto`** y diseño de mensaje binario. |
| Transmite metadatos, seguridad y ejemplos (reemplazó a Swagger). | — |
| **Restricciones tolerantes:** añadir campos adicionales generalmente **no rompe** la compatibilidad con clientes existentes. | **Restricciones críticas:** cambiar tipos de datos, orden, eliminar o renombrar campos **rompe la compatibilidad inmediatamente**. El versionado es inflexible. |

### 4.10 El ecosistema de pruebas de APIs

```
Pruebas de APIs
├── Estrategias de Testing
│   ├── Cuadrante de Pruebas (Q1–Q4)
│   └── Pirámide de Pruebas (Unidad, Servicio, E2E)
├── Pruebas de Contrato
│   ├── Contratos Impulsados por el Consumidor (CDC)
│   ├── Contratos del Productor
│   └── Frameworks (ej. Pact)
├── Pruebas de Componente API
├── Pruebas de Integración API
│   ├── Uso de Servidores Stub
│   └── Contenedorización (Testcontainers)
└── Pruebas de Extremo a Extremo (E2E)
```

### 4.11 Arquitectura de tráfico en entornos contenerizados

El despliegue en Kubernetes se automatiza en el pipeline. Para permitir liberaciones avanzadas es vital comprender la topología de red:

| Tipo de tráfico | Componente | Función |
|---|---|---|
| **Norte–Sur** | **API Gateways** | Controlan el tráfico de ingreso desde el exterior. Permiten enrutamiento y división de tráfico (*traffic splitting*), fundamental para Canary y A/B Testing. |
| **Este–Oeste** | **Service Mesh** | Controla el tráfico interno entre microservicios. Multiplexa solicitudes, optimiza rendimiento y facilita la replicación de tráfico (*traffic mirroring*) interno. |

### 4.12 Estrategias de liberación: mitigación de riesgos

| | **Canary Releases** | **Blue-Green Deployment** |
|---|---|---|
| **Mecanismo** | Introduce la nueva versión a un pequeño porcentaje del tráfico real (ej. 90% v1 / 10% v2-canary). | Despliegue de un entorno 'verde' inactivo en paralelo al 'azul' activo. Conmutación (*flip*) total del tráfico en un instante. |
| **Caso de uso** | Ideal para monitorear métricas técnicas (latencia, errores) y KPIs de negocio con bajo riesgo. Promoción gradual y automatizada. | Requiere el doble de infraestructura. Permite una reversión (*rollback*) inmediata si se detectan problemas. |

### 4.13 Traffic Mirroring y la separación de preocupaciones

- Se **copia o duplica el tráfico de producción** hacia una ubicación adicional (Shadow App). Los resultados se registran pero **NO se devuelven al cliente**.
- Permite lanzamientos **"en la oscuridad" (out-of-band)** para evaluar el rendimiento operativo y el **estrés real** antes de afectar a un solo usuario.

> ## **Desplegar ≠ Liberar.**
> La clave de las arquitecturas API modernas es separar el **Despliegue** (instalar el código en los servidores de forma segura) de la **Liberación** (exponer esas nuevas características al tráfico del usuario mediante el Gateway o Mesh).

---

## Material complementario — Arquitectura de Seguridad en APIs

**Subtítulo del deck:** *Autenticación y Autorización en la Capa 7 (API Keys, OAuth 2.0 y JWT)*

### 5.1 La seguridad como pilar de la arquitectura distribuida

Las APIs facilitan la integración de sistemas heterogéneos y la innovación abierta. **Su viabilidad depende fundamentalmente de la seguridad**: control de accesos mediante API Keys, OAuth y JWT.

### 5.2 El perímetro de seguridad

- Los mecanismos de seguridad **controlan quién puede acceder y qué puede hacer**.
- El **vector de entrega físico** ocurre en la **Capa 4 de la anatomía (Parámetros/Headers)**, donde viajan los metadatos de autenticación.
- Tres mecanismos sobre esa capa: **1. API Keys** (identificadores únicos) · **2. OAuth 2.0** (autorización delegada) · **3. JWT** (tokens firmados).

### 5.3 El vehículo de entrega: encabezados HTTP

```
Authorization: <Tipo> <Credenciales>
```

| **Basic Auth** | **Bearer Token** |
|---|---|
| `Basic <Base64(client_id:secret)>` | `Bearer <Access-Token>` |
| Transmite credenciales codificadas. **Requiere TLS/HTTPS estricto.** | El cliente es portador de un token opaco o firmado. **Uso estándar en APIs modernas.** |

### 5.4 Los tres mecanismos, con sus metáforas arquitectónicas

| Mecanismo | Metáfora | Mecánica |
|---|---|---|
| **API Keys** | **La tarjeta de identificación (ID Badge)** | Paso 1: el cliente envía un identificador único (cadena alfanumérica) en el Header o Query. Paso 2: el servidor busca la llave en su base de datos para identificar el origen de la petición. Simple de implementar. Útil para identificar **aplicaciones, no usuarios**. **No caducan automáticamente** → requiere estrategias de rotación para mitigar riesgos. |
| **OAuth 2.0** | **La llave de valet parking** (permite estacionar el auto, pero no abrir el maletero) | 1. El usuario autoriza a la Aplicación (Cliente). 2. El Servidor de Autorización emite un Access Token. 3. El Cliente presenta el token al Servidor de Recursos (ej. Google, Facebook Login). **Key takeaway:** desacopla la autenticación del acceso a la API. **El cliente nunca ve la contraseña del usuario.** |
| **JWT** | **La pulsera VIP** (contiene toda la información necesaria y evidencia de manipulación) | Header (algoritmo de firma y tipo de token) · Payload/Claims (datos de identidad y permisos) · Signature (firma criptográfica que garantiza que el token no ha sido alterado). **Key takeaway:** autenticación **sin estado (stateless)**; el servidor valida matemáticamente la firma sin consultar una base de datos. |

### 5.5 Arquitectura en la práctica: API de PayPal

- **Endpoint:** `api-m.paypal.com/v2/payments/...`
- **Objetivo:** autorizar y capturar pagos de forma segura.
- **Opción A (token portador):** `Authorization: Bearer <Access-Token>`
- **Opción B (credenciales básicas):** `Authorization: Basic <client_id>:<secret>`

### 5.6 Matriz de decisión arquitectónica

| Mecanismo | Propósito principal | Estado | Complejidad de implementación |
|---|---|---|---|
| **API Keys** | Autenticación de apps | Stateful (requiere BD) | Baja |
| **Basic Auth** | Autenticación simple | Stateless (pero acoplado a credenciales) | Baja |
| **OAuth 2.0** | Autorización delegada a terceros | Centralizado en Auth Server | Alta |
| **JWT** | Identidad y permisos portables | Stateless (autocontenido) | Media |

> La elección del patrón dependerá del **ecosistema** (interno vs. público) y del **nivel de desacoplamiento requerido**.

---

## Caso de estudio recurrente: NeoMarket

La Unidad 2 utiliza **NeoMarket** (plataforma de e-commerce) como hilo conductor para justificar cada patrón. Vale la pena reutilizarlo como referencia narrativa en el proyecto final.

### El desafío: anatomía de una sobrecarga

1. **Efecto dominó:** caídas en cascada por bloqueos en red.
2. **Experiencia fragmentada:** sobrecarga de datos inútiles en dispositivos móviles.
3. **Cuellos de botella:** lecturas masivas bloqueadas por picos de escritura (base de datos monolítica).

### Síntomas → patrones aplicados

| Síntoma NeoMarket | Patrón |
|---|---|
| Validación de Partners tarda 10 s, agotando el pool de hilos | Circuit Breaker |
| Fallos transitorios en pagos provocan reintentos masivos que colapsan la red | Retry + Jitter + Backoff exponencial |
| La App móvil descarga un JSON masivo del perfil de usuario y descarta el 75% | BFF |
| Cargar un producto requiere 3 llamadas HTTP desde el móvil, disparando la latencia | API Composition |
| Compras masivas bloquean las tablas de inventario durante Ofertas Flash | CQRS |
| Imposibilidad de auditar alteraciones erróneas en el saldo de comisiones de partners | Event Sourcing |
| Integración de la API con sistemas POS de tiendas partner | REST |
| BFF móvil para renderizar catálogos anidados complejos en una sola petición | GraphQL |
| Tráfico East-West: chequeo de inventario en milisegundos durante el pago | gRPC |
| Procesamiento de compras durante Ofertas Flash (encolado de eventos) | EDA |
| La pasarela de pagos notifica a `/api/webhooks/payments` cuando una transacción es aprobada | WebHooks |

**Caso alterno VitalsGuard (IoT):** aplicación que recibe un stream en vivo de latidos por minuto de pacientes mayores, graficando curvas en tiempo real sin polling constante → **WebSockets**.

---

## Modelo ArchiMate de referencia (`descuentos.archimate`)

Archivo de Archi (v5.0.0) llamado **`neomarket`**, incluido en `recursos/`. Sirve de plantilla para el diagrama de arquitectura empresarial del proyecto.

| Capa | Elementos |
|---|---|
| **Strategy** | Course of Action: *Costo final para descuentos* |
| **Business** | Actores: Cliente, Bodeguero, Contador General, Financiero, Logística e inventario.<br>Procesos: Registrar cliente, Listar inventario, Programar descuentos, Comprar productos, Realizar pago, Enviar cliente, Revisar costos operativos, Revisar costos producto. |
| **Application** | **API Gateway**, Login Component, Seguridad Token Component, Catalogo Component, Pasarela Pago Component, Entrega Component, Data Object. |
| **Technology & Physical** | SQL Azure, Mongo DB Atlas, Base Datos Inventario, Base Datos Ventas, Servidor Dedicado, DELL APP pago. |
| **Motivation** | Business Goal, *Disminuir inventario* |
| **Views / Groupings** | Business Architecture, Application Architecture, Infrastructure Architecture |

Nota: la mezcla **SQL Azure + MongoDB Atlas** encaja directamente con el patrón **CQRS** de la Unidad 2 (escrituras transaccionales vs. lecturas optimizadas).

Imagen adicional en recursos: `Rediseño_hacia_arquitecturas_de_APIs.png`.

---

## Glosario rápido de siglas

| Sigla | Significado |
|---|---|
| **ABAC** | Attribute-Based Access Control |
| **AsyncAPI** | Especificación de contratos para APIs asíncronas / dirigidas por eventos |
| **BFF** | Backend For Frontend |
| **CDC** | Consumer-Driven Contracts |
| **CQRS** | Command Query Responsibility Segregation |
| **CSWSH** | Cross-Site WebSocket Hijacking |
| **DX** | Developer Experience |
| **E2E** | End-to-End (pruebas) |
| **EDA** | Event-Driven Architecture |
| **ES** | Event Sourcing |
| **FaaS** | Function as a Service |
| **gRPC** | Google Remote Procedure Call |
| **HATEOAS** | Hypermedia As The Engine Of Application State |
| **JWT** | JSON Web Token |
| **OAS** | OpenAPI Specification |
| **OIDC** | OpenID Connect |
| **QoS** | Quality of Service |
| **RBAC** | Role-Based Access Control |
| **REST** | Representational State Transfer |
| **SDL** | Schema Definition Language (GraphQL) |
| **SemVer** | Semantic Versioning |
| **SOA** | Service-Oriented Architecture |
| **TTFHW** | Time To First Hello World |
| **TTFPA** | Time To First Profitable App |

---

## Bibliografía consolidada

**Unidad 1**
- RFC 2616: *Hypertext Transfer Protocol — HTTP/1.1* (1999, 1 de junio). IETF Datatracker. https://datatracker.ietf.org/doc/html/rfc2616
- It, S. (2015). *Estrategia y arquitectura de API: una estrategia coordinada*. CIOAL The Standard IT. https://thestandardcio.com/2015/11/13/estrategia-y-arquitectura-de-api-una-estrategia-coordinada/
- https://veronica.ec/developers/api-getting-started.html
- https://www.registrocivil.gob.ec/web-service-2/
- https://developers.mercadolibre.cl/es_ar/api-docs-es

**Unidad 2**
- Gough, J., Bryant, D., & Auburn, M. (2023). *Mastering API Architecture: Design, Operate, and Evolve API-Based Systems*. O'Reilly Media.
- Casciaro, M. (2020). *Node.js Design Patterns*. Packt Publishing.
- Mabotha, E., Mabunda, N. E., Ali, A. et al. (2025). *Exploring dynamic RESTful API implementation in IoT environments using Docker*. Sci Rep 15, 34267. https://doi.org/10.1038/s41598-025-16460-0
- Kufner, J., & Mařík, R. (2019). *Restful State Machines and SQL Database*. IEEE Access, 7, 144603–144617.
- Guamán, D., Delgado, S., & Pérez, J. (2021). *Classifying model-view-controller software applications using self-organizing maps*. IEEE Access, 9, 45201–45229.
- Barrón, J. P. G., Manso, M. Á., Alcarria, R., & Gomez, R. P. (2014). *A mobile crowdsourcing platform for urban infrastructure maintenance*. IEEE IMIS 2014, 358–363.
- Yan, M., Sun, H., & Liu, X. (2014). *iTest: testing software with mobile crowdsourcing*. CrowdSoft 2014, 19–24.
- ISO/IEC 25010 — Modelo de calidad del producto software.

**Unidad 4 / Seguridad**
- Munonye, K., & Péter, M. (2022). *Machine learning approach to vulnerability detection in OAuth 2.0 authentication and authorization flow*. Int. J. Inf. Secur. 21, 223–237. https://doi.org/10.1007/s10207-021-00551-w
- Oh, S-R, & Kim, Y-G. (2020). *AFaaS: Authorization framework as a service for Internet of Things based on interoperable OAuth*. International Journal of Distributed Sensor Networks, 16(2). https://doi.org/10.1177/1550147720906388
- Siriwardena, P. (2020). *Advanced API security: OAuth 2.0 and beyond*. Apress.
