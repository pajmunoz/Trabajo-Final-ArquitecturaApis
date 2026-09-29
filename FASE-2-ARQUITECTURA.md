# API de planes de ahorro bancario

**Fase 2: Arquitectura y patrones de diseño (RA2)**

Universidad Politécnica Salesiana · Maestría en Software

Asignatura: Patrones de Diseño de APIs

Docente: Ing. Patsy Malena Prieto, MSc.

**Integrantes:**

1. ______________________
2. ______________________
3. ______________________
4. ______________________
5. ______________________

Fecha: ____________________

---

## 1. Introducción

### 1.1 Propósito del documento

En la Fase 1 justificamos el caso de negocio de la Billetera de Ahorro. En esta segunda fase definimos cómo se va a construir: elegimos el estilo arquitectónico, armamos los diagramas de la solución y justificamos los patrones de diseño que decidimos aplicar.

Para tomar las decisiones usamos las herramientas que revisamos en la Unidad 2 de la asignatura (Prieto, 2026): la matriz de calidad ISO/IEC 25010, el árbol de decisiones de interacción de datos, los tres pilares de patrones y la matriz de diagnóstico.

### 1.2 Requisitos que guían la arquitectura

Al revisar los requisitos de la Fase 1 notamos que no todos influyen igual en la arquitectura. La siguiente tabla recoge los que más pesaron en nuestras decisiones:

| Requisito | Descripción | Impacto en la arquitectura |
|---|---|---|
| RNF-01.1 | p95 menor a 500 ms en endpoints síncronos | Caché HTTP, paginación y pocas llamadas síncronas |
| RNF-01.2 | Procesamiento batch del corte de débitos | Batch Processor y uso de eventos para absorber el pico |
| RNF-02.1 | JWT de corta duración emitido por un servicio interno | Servicio de Autenticación y validación en el Gateway |
| RNF-02.3 | Consistencia ACID en los movimientos de saldo | Una sola base relacional para las escrituras |
| RNF-03.1 | Desacoplamiento del Core legacy vía EDA | Message Broker y Adaptador Core |
| RNF-03.2 | Disponibilidad de 99.9 % | Circuit Breaker y Retry con jitter |
| RNF-03.3 | Auditoría inmutable por transacción | Ledger de solo inserción |
| RF-01.4 y RF-01.5 | Historial de planes y de movimientos | Paginación por offset y por cursor, filtros |
| RF-02.1 | Simulación pública sin autenticación | Rate Limiting y caché |
| RF-03.1 | Débito automático con 5 intentos cada 24 h | Reintento de negocio a cargo del Batch |

*Tabla 1. Requisitos con impacto en la arquitectura*

## 2. Arquitectura de software

### 2.1 Capas de la arquitectura

Organizamos los componentes según las cuatro capas de una arquitectura orientada a APIs vistas en clase. En la capa de integración ubicamos todo lo que protege al dominio de lo externo: el Gateway frente a los clientes y el Adaptador frente al Core legacy.

| Capa | Componentes | Responsabilidad |
|---|---|---|
| Presentación | Banca web (SPA en Next.js) | Interfaz para simular, crear, consultar, aportar y cancelar planes |
| Integración | API Gateway (Kong), Adaptador Core y Message Broker (RabbitMQ) | Punto de entrada, seguridad perimetral, traducción hacia el legacy y mensajería asíncrona |
| Aplicación | Ahorro Core API, Servicio de Autenticación y Batch Processor | Reglas de negocio de los planes, emisión de tokens y corte de débitos |
| Acceso a datos | PostgreSQL 15 | Planes, calendario de aportes, usuarios y ledger con transacciones ACID |

*Tabla 2. Capas y componentes de la solución*

### 2.2 Diagrama de contexto

Modelamos la arquitectura con el enfoque C4 en Structurizr DSL (archivo diagramas/workspace.dsl). A nivel de contexto el sistema solo depende de dos sistemas que el banco ya tiene: el Core bancario, que sigue siendo el responsable de las operaciones contables, y el sistema de notificaciones.

![Ilustración 1. Diagrama de contexto (C4, nivel 1)](diagramas/export/img/Contexto.png)

*Ilustración 1. Diagrama de contexto (C4, nivel 1)*

### 2.3 Diagrama de contenedores

Decidimos desplegar la solución como un monolito modular y no como microservicios. En la infografía de rediseño vista en clase, esta opción aparece como la adecuada para equipos pequeños y dominios simples, y ese es nuestro caso: tenemos un solo dominio (los planes de ahorro) y un equipo de cinco personas. Separamos en contenedores propios únicamente el Batch Processor, el Adaptador Core y el Servicio de Autenticación, porque tienen un ciclo de ejecución o requisitos de seguridad distintos a los de la API.

![Ilustración 2. Diagrama de contenedores (C4, nivel 2)](diagramas/export/img/Contenedores.png)

*Ilustración 2. Diagrama de contenedores (C4, nivel 2)*

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
| SPA | Next.js (React) | Interfaz del cliente |
| API Gateway | Kong Gateway | Punto de entrada único, TLS 1.3, validación de firma y expiración del JWT, Rate Limiting |
| Servicio de Autenticación | Spring Boot + JWT (RS256) | Verifica credenciales y emite el access token y el refresh token |
| Ahorro Core API | Spring Boot (REST) | Planes, simulación pública, aportes bajo solicitud y consultas |
| Batch Processor | CronJob / Worker | Corte diario de débitos automáticos y reintentos de negocio |
| Adaptador Core | Spring Boot + Resilience4j | Único punto de contacto con el Core legacy |
| Message Broker | RabbitMQ | Publicación y suscripción de eventos |
| Base de datos | PostgreSQL 15 | Datos del dominio y ledger |

*Tabla 3. Contenedores del sistema*

### 2.4 Vista ArchiMate

Actualizamos la vista ArchiMate de la Fase 1 para que coincida con los contenedores anteriores. En la capa de motivación agregamos un segundo requisito de débito, porque el producto maneja dos casos: el débito automático, que ejecuta el Batch Processor en la fecha programada, y el aporte que el cliente solicita desde la aplicación. Los dos terminan publicando el mismo evento DebitoSolicitado, así que comparten el camino hacia el Core, la resiliencia y la trazabilidad.

![Ilustración 3. Vista ArchiMate de la Fase 2](vista_archimate_fase2.png)

*Ilustración 3. Vista ArchiMate de la Fase 2*

## 3. Selección del estilo arquitectónico

### 3.1 Evaluación con ISO/IEC 25010

Como se vio en clase, no hay un estilo que sea mejor en todo: cada uno gana en unos atributos de calidad y pierde en otros. Por eso comparamos los cuatro estilos candidatos con la matriz de la Unidad 2 y agregamos una fila con nuestra valoración para este caso.

| Atributo | REST | GraphQL | gRPC | EDA |
|---|---|---|---|---|
| Facilidad de cacheo | Alto | Bajo | Bajo | N/A |
| Escalabilidad concurrente | Medio | Medio | Alto | Alto |
| Mantenibilidad | Alto | Medio | Medio | Bajo |
| Seguridad perimetral | Medio | Bajo | Alto | Medio |
| ¿Aplica a nuestro caso? | Sí. Cliente web, recursos simples y simulación que se puede cachear | No. No hay datos jerárquicos ni varios clientes, y se pierde el cacheo | No. El navegador no lo soporta de forma nativa y hay un solo servicio | Sí. Hay un pico diario de débitos y un Core legacy |

*Tabla 4. Comparación de estilos según ISO/IEC 25010*

### 3.2 Árbol de decisiones

Recorrimos el árbol de decisiones de la clase con las características del proyecto. La primera pregunta es si hay comunicación interna de alta densidad entre microservicios; en nuestro caso no, porque existe un solo servicio de dominio, así que gRPC no aporta. La segunda pregunta es si hay picos masivos que puedan saturar la base de datos, y aquí la respuesta es sí: el corte diario concentra miles de débitos en pocas horas, lo que nos llevó a desacoplar ese flujo con EDA. Por último, la interfaz no maneja datos jerárquicos complejos, ya que planes y movimientos son recursos planos, por lo que para el consumo del cliente nos quedamos con REST y OpenAPI.

### 3.3 Decisión

Con base en lo anterior, decidimos usar un estilo híbrido. REST (OpenAPI 3.1 y JSON) atiende las operaciones síncronas del cliente, y EDA con RabbitMQ se encarga de los débitos, las notificaciones y la integración con el Core.

Esta decisión tiene un costo que aceptamos de forma consciente. Uno de los principios vistos en clase dice que la complejidad no se destruye, se transfiere: EDA nos da aislamiento temporal frente al legacy, pero a cambio tenemos consistencia eventual y una trazabilidad más difícil. Para mitigarlo, cada evento lleva un correlation-id y la API expone el estado del débito (PENDIENTE, EJECUTADO o FALLIDO), de modo que el cliente no depende de una respuesta inmediata del Core.

## 4. Patrones de diseño

### 4.1 Patrones aplicados

La Tabla 5 resume los patrones que aplicamos. Para cada uno indicamos el pilar al que pertenece según la clasificación de la Unidad 2 y el problema que resuelve; cuando corresponde, usamos el síntoma tal como aparece en la matriz de diagnóstico.

| Patrón | Pilar | Dónde se aplica | Problema que resuelve |
|---|---|---|---|
| API Gateway | Borde | Kong, como entrada única | Centraliza TLS, validación del JWT, enrutamiento y cuotas (RNF-02.1) |
| Rate Limiting | Resiliencia | Kong, con un límite menor para anónimos en /simulaciones | Abuso del endpoint público; se responde 429 con Retry-After (RF-02.1) |
| Fachada / Adaptador | Integración | Adaptador Core | Aísla el dominio del protocolo legacy; si cambia el Core, solo se modifica el adaptador (RNF-03.1) |
| Circuit Breaker | Resiliencia | Llamadas del Adaptador al Core legacy | Cascadas de error por validaciones lentas; protege el pool de hilos (RNF-03.2) |
| Retry con backoff exponencial y jitter | Resiliencia | La misma llamada: 1 s, 2 s y 4 s más un valor aleatorio | Caídas por reintentos simultáneos (efecto estampida) |
| Paginación y filtrado | Consumo | GET /planes (offset) y GET /planes/{id}/movimientos (cursor) | Respuestas grandes y desplazamiento del offset (RF-01.4 y RF-01.5) |
| Caché HTTP | Consumo | GET /simulaciones con Cache-Control | La misma entrada da el mismo resultado; baja la latencia (RNF-01.1) |
| Publicación / suscripción | Estilo EDA | La API y el Batch publican; el Adaptador y Notificaciones consumen | Acoplamiento temporal con el Core y pico del corte (RNF-03.1 y RF-05.2) |
| Ledger de solo inserción | Persistencia | Tabla ledger en PostgreSQL | Auditoría inmutable; el saldo se obtiene sumando movimientos (RNF-03.3) |
| Idempotency-Key | Resiliencia | POST /planes/{id}/aportes | Evita que un reintento del cliente genere un segundo débito |

*Tabla 5. Patrones aplicados*

### 4.2 Resiliencia frente al Core legacy

El Circuit Breaker del Adaptador sigue la máquina de estados que se estudió en clase. Si más del 50 % de las llamadas fallan en una ventana de 10 segundos, pasa de cerrado a abierto y deja de llamar al Core; mientras está abierto responde de inmediato con un fallo controlado (un 503 para el cliente o un evento DebitoFallido con causa técnica). Después de 30 segundos pasa a semiabierto y deja pasar algunas llamadas de prueba antes de volver a cerrarse.

Durante el análisis nos dimos cuenta de que había que diferenciar dos tipos de reintento. El reintento técnico (Retry con jitter) repite en cuestión de segundos una llamada que falló por red o por timeout. El reintento de negocio (RF-03.1), en cambio, lo programa el Batch cada 24 horas, hasta cinco veces, cuando el Core rechaza el cargo. Con esta separación respondimos una pregunta que había quedado abierta en el tablero de ideación: un error técnico del banco no le consume al cliente ninguno de sus cinco intentos.

### 4.3 Paginación y filtrado

Usamos las dos estrategias de paginación vistas en la Unidad 3, cada una donde encaja mejor. Para los planes elegimos offset, porque cada cliente tiene pocos y así puede saltar a una página específica. Para los movimientos elegimos cursor, porque crecen sin límite y los registros nuevos del ledger desplazarían los resultados si usáramos offset.

```http
GET /planes?estado=ACTIVO&page=0&size=10
GET /planes/{id}/movimientos?cursor=eyJpZCI6MTIwfQ&limit=20

{ "items": [ { "id": 120, "tipo": "DEBITO", "monto": 50.00 } ],
  "siguienteCursor": "eyJpZCI6MTAwfQ", "hayMas": true }
```

### 4.4 Seguridad en el borde

Optamos por un servicio de autenticación propio basado en JWT. Este servicio verifica las credenciales del cliente (guardadas con hash bcrypt) y emite un access token firmado con RS256, válido por 15 minutos, junto con un refresh token. El Gateway valida la firma y la expiración con la clave pública, sin consultar al servicio en cada petición, lo que ayuda a mantener bajo el tiempo de respuesta. Los roles (CLIENTE, OPERADOR y AUDITOR) viajan en los claims del token y, además, la API verifica que el plan pertenezca al cliente que hace la solicitud.

### 4.5 Patrones evaluados y descartados

También evaluamos otros patrones del catálogo de la unidad que, por ahora, no se justifican en el proyecto:

| Patrón | Motivo del descarte |
|---|---|
| BFF | En el MVP hay un solo cliente web. Lo volveríamos a evaluar al incorporar la app móvil o a los socios. |
| CQRS | El volumen no lo justifica y separar los modelos pondría en riesgo la consistencia ACID del saldo (RNF-02.3). Una vista SQL es suficiente para las lecturas. |
| Service Registry | Solo hay un servicio de dominio; el DNS de la plataforma de contenedores alcanza. |
| API Composition | No hay varios servicios internos cuyas respuestas haya que combinar. |
| Strangler Fig | No reemplazamos funcionalidades del Core; el módulo es nuevo y convive con él a través del adaptador. |

*Tabla 6. Patrones descartados*

## 5. Conclusiones

El estilo híbrido REST y EDA surgió de aplicar el árbol de decisiones a nuestro caso: REST resuelve bien lo que consume el cliente, y EDA nos permite absorber el pico del corte diario sin quedar atados a la disponibilidad del Core legacy.

Procuramos que cada patrón respondiera a un requisito concreto y no aplicar patrones solo por aplicarlos. Así quedaron cubiertos los que la rúbrica considera esenciales (paginación, filtrado y resiliencia) y dejamos documentados los descartados con su motivo, para retomarlos si el producto crece hacia más canales o hacia socios externos.

Un resultado que no esperábamos al inicio fue que los dos tipos de débito pudieran compartir el mismo evento. Gracias a eso, la resiliencia y la auditoría se implementan una sola vez para ambos casos.

## 6. Referencias

- International Organization for Standardization. (2011). *ISO/IEC 25010:2011 Systems and software engineering: Systems and software Quality Requirements and Evaluation (SQuaRE)*. ISO.
- Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)*. RFC 7519. Internet Engineering Task Force.
- Nygard, M. T. (2018). *Release It! Design and deploy production-ready software* (2.ª ed.). Pragmatic Bookshelf.
- OpenAPI Initiative. (2021). *OpenAPI Specification, versión 3.1*.
- Prieto, P. M. (2026). *Unidad 2: Arquitectura y patrones para sistemas dirigidos por APIs* [Material de clase]. Maestría en Software, Universidad Politécnica Salesiana.
- Richardson, C. (2018). *Microservices patterns*. Manning.
