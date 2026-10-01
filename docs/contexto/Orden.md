# Trabajo Final: Diseño y Desarrollo de APIs

## Fases del proyecto

### Fase 1: Justificación de negocio (RA1)

- **Acción:** Definir el caso de negocio, la cadena de valor de las APIs y cómo el sistema abrirá nuevos flujos de ingresos o maximizará el valor del cliente.
- **Entregable:** Documento de visión del producto y modelo de monetización/negocio de la API.

### Fase 2: Arquitectura y patrones (RA2)

- **Acción:** Evaluar y seleccionar el estilo arquitectónico (`REST`, `GraphQL` o `gRPC`) y definir los patrones de diseño, como API Gateway, BFF, Circuit Breaker o paginación/filtrado avanzado.
- **Entregable:** Diagrama de arquitectura de software y justificación técnica de los patrones elegidos.

### Fase 3: Diseño del modelo y especificación (RA3)

- **Acción:** Diseñar el modelo de datos orientado a APIs y escribir la especificación formal del contrato.
- **Entregable:** Contrato de la API utilizando la especificación OpenAPI (Swagger) o similar.

### Fase 4: Desarrollo, seguridad y despliegue (RA4)

- **Acción:** Implementar los servicios backend robustos empleando buenas prácticas.

## Entregables técnicos

- **Seguridad:** Mecanismos de autenticación y autorización utilizando OAuth 2.0 o JWT.
- **Calidad:** Cobertura de código mediante pruebas unitarias.
- **Rendimiento:** Reporte de pruebas de estrés/carga usando herramientas como JMeter o k6.
- **DevOps:** Despliegue de la API en un entorno de nube o contenedorizado (Docker/Kubernetes).

## Escenarios y parámetros técnicos mínimos de pruebas

Se deben ejecutar y reportar al menos dos escenarios diferenciados para evaluar el comportamiento elástico de la API.

### 1. Prueba de carga sostenida (Load/Stress Testing)

Evalúa cómo se comporta la API bajo una demanda superior al promedio esperado para verificar la estabilidad de los recursos (CPU, memoria y base de datos).

- **Usuarios concurrentes virtuales (VUs):** Escalar progresivamente desde 0 hasta un pico de 100 a 200 VUs concurrentes, ajustable según la complejidad de la arquitectura.
- **Fase de ramp-up (subida):** 2 a 3 minutos para alcanzar el pico máximo.
- **Fase de plateau (meseta):** Mantener el pico máximo durante 5 a 10 minutos.
- **Fase de ramp-down (bajada):** 1 a 2 minutos hasta volver a 0.

### 2. Prueba de pico extremo (Spike Testing)

Evalúa la resiliencia del sistema, los mecanismos de caché, el *rate limiting* y las políticas de autoescalado ante un incremento masivo y repentino de tráfico.

- **Usuarios concurrentes virtuales (VUs):** Incrementar abruptamente a un volumen de 5 a 10 veces la carga normal, por ejemplo, de 0 a 500 VUs de inmediato.
- **Duración del pico:** Mantener la carga extrema durante 1 a 2 minutos.
- **Fase de recuperación:** Reducir a 0 inmediatamente después para analizar si el sistema recupera su estado normal de forma automatizada o si se producen caídas en cascada.

## Métricas e indicadores clave de rendimiento (KPIs)

El reporte final debe incluir gráficas y tablas analíticas con las siguientes métricas clave, que servirán como evidencia para la rúbrica de calificación:

- **Rendimiento (Throughput):** Medido en peticiones por segundo (RPS).
- **Tiempo promedio de respuesta (Average Response Time).**
- **Percentiles críticos (p90, p95 y p99):** El p95 idealmente debe mantenerse por debajo de 500 ms para endpoints síncronos estándar.
- **Tasa de error (Error Rate):** Porcentaje de peticiones fallidas. Para alcanzar el nivel excelente, debe ser inferior al 1 % bajo carga sostenida. Se deben rastrear los códigos HTTP de error.
- **Punto de ruptura (Breakpoint):** Identificar con exactitud con cuántos usuarios concurrentes o RPS la API empieza a degradar sus tiempos de respuesta de forma exponencial o a arrojar errores HTTP recurrentes.

## Mapeo de entregables por unidad temática

| Unidad temática | Componente del proyecto final | Fecha de entrega |
|---|---|---|
| U1: Introducción a APIs | Documento de objetivos, anatomía y naturaleza de las APIs del sistema. | 19 septiembre 2026 |
| U2: Arquitecturas y patrones | Selección razonada de patrones y diseño del ecosistema guiado por APIs. | 25 septiembre 2026 |
| U3: Diseño de APIs | Modelo de datos de la API y especificación técnica OpenAPI contract-first. | 26 septiembre 2026 |
| U4: Desarrollo de APIs | Código fuente con seguridad, pruebas unitarias/estrés y pipeline de despliegue. | 5 octubre 2026 |