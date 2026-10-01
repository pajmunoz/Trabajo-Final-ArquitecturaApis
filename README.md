# Billetera de Ahorro — Trabajo Final de Patrones de Diseño de APIs

Plataforma de planes de ahorro programado dirigida por APIs. Maestría en Software, Universidad Politécnica Salesiana.

- **API desplegada:** `http://3.151.57.252` (HTTPS con TLS 1.3 en `https://3.151.57.252`). El backend y el frontend se mantienen apagados fuera de las pruebas; se encienden juntos desde GitHub Actions → *Azure - encender o apagar* (acción `encender`, casilla del backend marcada).
- **Aplicación web (Azure App Service):** `https://billetera-ahorro-front.azurewebsites.net` — usuario de prueba `pablo.jara@email.com` / `goallet123`.
- **Documentación de la API (Swagger UI):** `http://3.151.57.252/docs/`
- **Informe final (PDF):** [`entregables/Informe-Final-Billetera-de-Ahorro.pdf`](entregables/Informe-Final-Billetera-de-Ahorro.pdf)

## Estructura

| Carpeta | Contenido |
|---|---|
| [`contracts/`](contracts/openapi.yaml) | Contrato OpenAPI 3.1, fuente de verdad de la API |
| [`backend/`](backend/README.md) | API, autenticación, batch y adaptador del Core en Node.js (por capas), pruebas, pruebas de carga y despliegue |
| [`frontend/`](frontend/README.md) | Aplicación web (Next.js) |
| [`bdd/`](bdd/) | Modelo del Core bancario simulado (MongoDB) |
| [`docs/informes/`](docs/informes/) | Informes de cada fase en Markdown (fuente del informe final) |
| [`docs/diagramas/`](docs/diagramas/README.md) | Modelo C4 (Structurizr) y vista ArchiMate |
| [`docs/evidencias/`](docs/evidencias/README.md) | Evidencias de contrato, pruebas, seguridad, despliegue y carga |
| [`docs/latex/`](docs/latex/) | Fuente LaTeX del informe final |
| [`docs/contexto/`](docs/contexto/TAREA-FINAL.md) | Enunciado, rúbrica, resumen de la materia y material de clase |
| [`entregables/`](entregables/README.md) | Lo que se entrega, con el estado de cada ítem |
| [`.github/workflows/`](.github/workflows/) | CI/CD del backend (AWS) y del frontend (Azure), y encendido/apagado de ambos entornos |

## Informes por fase

1. [Fase 1 — Visión del producto y modelo de negocio](docs/informes/VISION-NEGOCIO.md) · [Requerimientos](docs/informes/REQUERIMIENTOS.md)
2. [Fase 2 — Arquitectura y patrones](docs/informes/FASE-2-ARQUITECTURA.md) · [Detalle de patrones de diseño](docs/informes/PATRONES-DISENO.md)
3. Fase 3 — Modelo de datos y contrato: [`contracts/openapi.yaml`](contracts/openapi.yaml) (capítulo 4 del informe final)
4. [Fase 4 — Desarrollo, seguridad, pruebas, despliegue y carga](docs/informes/FASE-4-DESARROLLO.md)

## Compilar el informe final

```bash
bash docs/latex/compilar.sh   # requiere LuaLaTeX, Biber, pandoc y ruby
```

Los capítulos de las fases se generan desde los Markdown de `docs/informes/`, así que basta con editar esos archivos y volver a compilar.
