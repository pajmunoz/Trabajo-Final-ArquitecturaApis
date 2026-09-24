# Proyecto Final: Plataforma Empresarial Dirigida por APIs (API-First)

> **Asignatura:** MSOF — Patrones de Diseño de APIs · Maestría en Software (UPS)
> **Modalidad:** grupal (incluye sustentación grupal)
> **Documento de contexto complementario:** [`RESUMEN-MATERIA.md`](./RESUMEN-MATERIA.md)

---

## Fechas y estado

| Dato | Valor |
|---|---|
| **Apertura** | jueves, 17 de septiembre de 2026, 00:00 |
| **Cierre** | lunes, 5 de octubre de 2026, 23:00 |
| **Número del intento** | Intento 1 |
| **Estado de la entrega** | Todavía no se han realizado envíos |
| **Estado de la calificación** | Sin calificar |
| **Tiempo restante (al momento de leer el enunciado)** | 14 días 3 horas |
| **Última modificación** | — |

---

## Estructura del proyecto: 4 fases (una por Resultado de Aprendizaje)

### Fase 1 — Justificación de Negocio (RA1)

**Acción:** Definir el caso de negocio, la cadena de valor de las APIs y cómo el sistema abrirá nuevos flujos de ingresos o maximizará el valor del cliente.

**Entregable:** Documento de visión del producto y modelo de monetización/negocio de la API.

> *Conecta con:* Unidad 1 (anatomía, naturaleza, ecosistemas, modelos de monetización) y Unidad 3 §3.2–3.5 (cadena de valor, pirámide de 6 capas, propuesta de valor, matriz de modelos de negocio).

---

### Fase 2 — Arquitectura y Patrones (RA2)

**Acción:** Evaluar y seleccionar el estilo arquitectónico (REST, GraphQL o gRPC) y definir los patrones de diseño (ej. API Gateway, BFF, Circuit Breaker o paginación/filtrado avanzado).

**Entregable:** Diagrama de arquitectura de software y justificación técnica de los patrones elegidos.

> *Conecta con:* Unidad 2 completa — playbook de estilos, matriz ISO/IEC 25010, árbol de decisiones, los 3 pilares de patrones y la matriz de diagnóstico.

---

### Fase 3 — Diseño del Modelo y Especificación (RA3)

**Acción:** Diseñar el modelo de datos orientado a APIs y escribir la especificación formal del contrato.

**Entregable:** Contrato de la API utilizando la especificación **OpenAPI (Swagger)** o similar.

> *Conecta con:* Unidad 3 §3.6–3.7 (API-First, taxonomía técnica, paginación offset vs. cursor) y Unidad 4 §4.6–4.9 (RESTful, SemVer, OpenAPI vs. gRPC).

---

### Fase 4 — Desarrollo, Seguridad y Despliegue (RA4)

**Acción:** Implementar los servicios backend robustos empleando buenas prácticas.

**Entregables técnicos:**

| Ámbito | Requisito |
|---|---|
| **Seguridad** | Mecanismos de autenticación y autorización utilizando **OAuth 2.0 o JWT**. |
| **Calidad** | Cobertura de código mediante **pruebas unitarias**. |
| **Rendimiento** | **Reporte de pruebas de estrés / carga** (usando herramientas como **JMeter** o **k6**). |
| **DevOps** | **Despliegue** de la API en un entorno de **nube o contenedorizado (Docker/Kubernetes)**. |

> *Conecta con:* Unidad 4 completa + deck de Arquitectura de Seguridad en APIs.

---

## Escenarios y parámetros técnicos mínimos de pruebas

Se deben **ejecutar y reportar al menos dos escenarios diferenciados** para evaluar el comportamiento elástico de la API.

### Escenario 1 — Prueba de Carga Sostenida (Load / Stress Testing)

Evalúa cómo se comporta la API bajo una demanda superior al promedio esperado, para verificar la estabilidad de los recursos (CPU, memoria, base de datos).

| Parámetro | Valor |
|---|---|
| **Usuarios concurrentes virtuales (VUs)** | Escalar progresivamente desde 0 hasta un pico de **100 a 200 VUs** concurrentes (ajustable según la complejidad de la arquitectura). |
| **Fase de Ramp-up (subida)** | **2 a 3 minutos** para alcanzar el pico máximo. |
| **Fase de Plateau (meseta)** | Mantener el pico máximo durante **5 a 10 minutos**. |
| **Fase de Ramp-down (bajada)** | **1 a 2 minutos** hasta volver a 0. |

### Escenario 2 — Prueba de Pico Extremo (Spike Testing)

Evalúa la resiliencia del sistema, los mecanismos de caché, el rate limiting y las políticas de autoescalado ante un incremento masivo y repentino de tráfico.

| Parámetro | Valor |
|---|---|
| **Usuarios concurrentes virtuales (VUs)** | Incrementar abruptamente a **5–10× la carga normal** (ej. de 0 a **500 VUs** de inmediato). |
| **Duración del pico** | Mantener la carga extrema durante **1 a 2 minutos**. |
| **Fase de recuperación** | Reducir a 0 inmediatamente después, para analizar si el sistema recupera su estado normal de forma automatizada o si se producen caídas en cascada. |

---

## Métricas e Indicadores Clave de Rendimiento (KPIs)

El reporte final **debe incluir gráficas y tablas analíticas** con las siguientes métricas, que sirven de evidencia para la rúbrica:

| KPI | Definición | Umbral exigido |
|---|---|---|
| **Rendimiento (Throughput)** | Peticiones por segundo (RPS / Requests Per Second). | — |
| **Tiempo promedio de respuesta** | Average Response Time. | — |
| **Percentiles críticos (p90, p95, p99)** | Cruciales en arquitectura de APIs para medir la experiencia de los usuarios más lentos. | **p95 idealmente por debajo de 500 ms** para endpoints síncronos estándar. |
| **Tasa de error (Error Rate)** | Porcentaje de peticiones fallidas. Se deben **rastrear los códigos HTTP de error**. | **< 1 %** bajo carga sostenida para aprobar la rúbrica en nivel Excelente. |
| **Punto de ruptura (Breakpoint)** | Identificar **con exactitud** con cuántos usuarios concurrentes o RPS la API empieza a degradar sus tiempos de respuesta de forma exponencial o a arrojar errores HTTP recurrentes. | — |

---

## Mapeo de entregables por unidad temática

| Unidad Temática | Componente del Proyecto Final | Fecha de entrega |
|---|---|---|
| **U1: Introducción a APIs** | Documento de objetivos, anatomía y naturaleza de las APIs del sistema. | **19 de septiembre de 2026** |
| **U2: Arquitecturas y Patrones** | Selección razonada de patrones y diseño del ecosistema guiado por APIs. | **25 de septiembre de 2026** |
| **U3: Diseño de APIs** | Modelo de datos de la API y especificación técnica OpenAPI contract-first. | **26 de septiembre de 2026** |
| **U4: Desarrollo de APIs** | Código fuente con seguridad, pruebas unitarias/estrés y pipeline de despliegue. | **5 de octubre de 2026** |

---

## Rúbrica de calificación

**Puntaje total: 20 puntos** distribuidos en 5 criterios.

### 1. Justificación de Negocio y Anatomía — máx. 4 puntos

| Nivel | Puntos | Descriptor |
|---|---|---|
| Insuficiente | **0** | No justifica la necesidad de negocio o la descripción de la anatomía y naturaleza de la API es incorrecta o vaga. La información presentada es menos del 30% correcta. |
| Básico | **1.6** | La información es correcta entre el 31% y el 60%. Identifica la anatomía de la API, pero la justificación de negocio y los objetivos de monetización están incompletos o carecen de sustento estratégico. |
| Competente | **2.8** | La información es correcta entre el 61% y el 90%. Justifica la necesidad de negocio y describe la anatomía de la API de forma clara, pero la alineación entre la cadena de valor y las metas del cliente es difusa. |
| **Excelente** | **4** | Explica claramente la necesidad de negocio, la cadena de valor y la estrategia de monetización. Identifica la naturaleza y anatomía de la API de forma impecable. |

### 2. Arquitectura de Software y Patrones — máx. 5 puntos

| Nivel | Puntos | Descriptor |
|---|---|---|
| Insuficiente | **0** | La arquitectura o los patrones elegidos son inadecuados para sistemas empresariales, no resuelven el problema o están mal aplicados. |
| Básico | **1.8** | Estructura la API con una arquitectura básica, pero omite patrones esenciales (paginación, filtros o resiliencia) o los aplica con errores. |
| Competente | **3.4** | Define una arquitectura clara y aplica patrones de diseño orientados a APIs, pero la argumentación técnica de sus decisiones de diseño es débil. |
| **Excelente** | **5** | Evalúa y justifica con alto criterio técnico el estilo arquitectónico elegido. Aplica de manera óptima patrones de diseño empresariales orientados a APIs. |

### 3. Modelado y Contrato de la API — máx. 4 puntos

| Nivel | Puntos | Descriptor |
|---|---|---|
| Insuficiente | **0** | El contrato de la API no se entregó, tiene errores críticos de sintaxis que impiden su lectura o no cumple con el estándar técnico. |
| Básico | **1.6** | El contrato OpenAPI está incompleto, faltan esquemas importantes o no sigue los estándares de diseño de un modelo orientado a APIs. |
| Competente | **2.8** | Diseña el modelo de datos y el contrato OpenAPI, pero presenta inconsistencias menores en las rutas, códigos de estado HTTP o tipado de datos. |
| **Excelente** | **4** | Diseña un modelo de datos orientado a APIs estructurado. Entrega un contrato OpenAPI (Swagger) maduro, limpio, sin errores y autocontenido. |

### 4. Implementación, Seguridad y Pruebas — máx. 5 puntos

| Nivel | Puntos | Descriptor |
|---|---|---|
| Insuficiente | **0** | El código de los servicios no funciona, no es seguro o no presenta evidencias de pruebas unitarias ni de estrés. |
| Básico | **1.8** | El sistema backend funciona a nivel básico, pero la seguridad presenta vulnerabilidades críticas o carece por completo de pruebas de calidad. |
| Competente | **3.4** | Desarrolla el servicio y la seguridad (OAuth2/JWT) de forma funcional, pero la cobertura de pruebas unitarias es baja o el análisis de estrés es superficial. |
| **Excelente** | **5** | Desarrolla los servicios con autenticación/autorización robusta (OAuth2/JWT). Adjunta pruebas unitarias (**>80% cobertura**) y reportes de pruebas de estrés. |

### 5. Despliegue y Sustentación Grupal — máx. 2 puntos

| Nivel | Puntos | Descriptor |
|---|---|---|
| Insuficiente | **0** | No se realizó el despliegue del sistema. La sustentación grupal es deficiente y no demuestra el nivel de maestría requerido. |
| Básico | **0.8** | El despliegue está incompleto o solo corre en local. La sustentación muestra falta de preparación conjunta o una división deficiente del trabajo. |
| Competente | **1.4** | Despliega la API de forma funcional, pero con fallas menores o locales. La sustentación grupal evidencia un dominio del tema ligeramente desigual. |
| **Excelente** | **2** | Despliega con éxito la API en un entorno accesible (nube/contenedores). La defensa demuestra un dominio crítico, articulado y equitativo del grupo. |

---

## Checklist de entregables (para nivel Excelente en toda la rúbrica)

### Documentación
- [ ] Documento de **visión del producto** (caso de negocio, problema, propuesta de valor).
- [ ] **Modelo de monetización** de la API, explícito y justificado (pay-as-you-go, freemium, tiered, revenue share, indirecto o híbrido).
- [ ] **Cadena de valor** de las APIs alineada con las metas del cliente.
- [ ] Descripción de la **anatomía** (8 capas) y **naturaleza** (intermediaria, abstracta, contractual, evolutiva) de las APIs del sistema.
- [ ] Clasificación del **ecosistema** (interno / partners / público).

### Arquitectura
- [ ] **Diagrama de arquitectura de software** (se puede partir de `recursos/descuentos.archimate`).
- [ ] **Justificación técnica** del estilo elegido (REST / GraphQL / gRPC), preferiblemente con evaluación explícita contra **ISO/IEC 25010**.
- [ ] Patrones aplicados y justificados. **No omitir los esenciales** que la rúbrica nombra: paginación, filtros y resiliencia.
  - [ ] API Gateway
  - [ ] BFF
  - [ ] Circuit Breaker
  - [ ] Retry + Jitter / Backoff exponencial
  - [ ] Rate limiting
  - [ ] Paginación (cursor-based recomendado) y filtrado avanzado
  - [ ] (Opcional según caso) CQRS, Event Sourcing, API Composition, Service Registry

### Contrato y modelo de datos
- [ ] **Modelo de datos orientado a API** (no simplemente el modelo relacional).
- [ ] **`openapi.yaml` / `openapi.json`** maduro, limpio, **sin errores de sintaxis y autocontenido**.
  - [ ] Rutas con sustantivos en plural (`/pacientes`, no `/crearPaciente`).
  - [ ] Códigos de estado HTTP correctos por operación (200, 201, 400, 401, 403, 404, 409, 429, 500).
  - [ ] Tipado consistente, `components/schemas` reutilizables.
  - [ ] Esquemas de seguridad declarados (`securitySchemes`: OAuth2 / bearerJWT).
  - [ ] Parámetros de paginación y filtrado documentados.
  - [ ] Versionamiento explícito (SemVer).

### Implementación
- [ ] Código fuente del backend funcional.
- [ ] **OAuth 2.0 y/o JWT** implementado (validación de firma, expiración, **scopes granulares por recurso**).
- [ ] Manejo centralizado de errores (middleware).
- [ ] Logs de operaciones CRUD, errores y tiempos de respuesta.

### Calidad y rendimiento
- [ ] **Pruebas unitarias con >80% de cobertura** + reporte de cobertura adjunto.
- [ ] **Script de carga sostenida** (k6 o JMeter): ramp-up 2–3 min → plateau 5–10 min a 100–200 VUs → ramp-down 1–2 min.
- [ ] **Script de spike**: 0 → ~500 VUs inmediato, 1–2 min de pico, caída inmediata a 0.
- [ ] **Reporte con gráficas y tablas**: RPS, tiempo promedio, p90/p95/p99, error rate por código HTTP, punto de ruptura identificado.
- [ ] Verificar **p95 < 500 ms** y **error rate < 1 %** bajo carga sostenida.

### DevOps
- [ ] `Dockerfile` / `docker-compose.yml` (o manifiestos de Kubernetes).
- [ ] Pipeline de despliegue (CI/CD).
- [ ] **API desplegada en un entorno accesible** (nube o contenedores) — no solo local.
- [ ] URL pública de la API y de la documentación Swagger.

### Sustentación
- [ ] División equitativa del trabajo, documentada.
- [ ] Todos los integrantes preparados para defender **cualquier** parte (la rúbrica penaliza el dominio desigual).

---

## Riesgos identificados en la rúbrica (dónde se pierden puntos)

1. **Monetización sin sustento estratégico** → techo de 1.6/4 en el criterio 1.
2. **Argumentación técnica débil** de las decisiones de arquitectura → techo de 3.4/5 en el criterio 2. No basta con elegir bien: hay que justificar los *trade-offs*.
3. **Omitir paginación, filtros o resiliencia** → techo de 1.8/5 en el criterio 2. Son citados explícitamente como "patrones esenciales".
4. **Contrato OpenAPI con inconsistencias menores** en rutas, códigos HTTP o tipado → techo de 2.8/4 en el criterio 3.
5. **Cobertura de pruebas baja o análisis de estrés superficial** → techo de 3.4/5 en el criterio 4. El umbral explícito es **>80% de cobertura**.
6. **Despliegue solo local** → techo de 0.8/2 en el criterio 5.
7. **Dominio desigual en la sustentación** → techo de 1.4/2 en el criterio 5.
