# Evidencias

Respaldo de lo que el informe afirma. Cada carpeta indica cómo se generó, para poder repetirlo.

| Carpeta | Contenido | Cómo se generó |
|---|---|---|
| [`fase-3-contrato/`](fase-3-contrato/) | Validación del contrato (`lint-redocly.txt`) y capturas de Swagger UI publicado en AWS | `npx @redocly/cli lint contracts/openapi.yaml`; capturas de `http://3.151.57.252/docs/` |
| [`fase-4-pruebas/`](fase-4-pruebas/) | Salida completa de las 97 pruebas, resumen, `coverage-summary.json` y reporte HTML (`reporte-html/index.html`) | `cd backend && docker compose up -d postgres rabbitmq && npm run coverage` |
| [`fase-4-seguridad/`](fase-4-seguridad/) | 18 verificaciones contra la API desplegada: autenticación, 401/403/404/400, idempotencia, State (409), If-Match (412), aporte asíncrono (202), rotación del refresh token, TLS 1.3 y rate limiting (429) | `bash docs/evidencias/generar-evidencias-api.sh` (tokens recortados) |
| [`fase-4-despliegue/`](fase-4-despliegue/) | Recursos en AWS, contenedores en la instancia y ejecución del pipeline de CI/CD | AWS CLI (cuenta enmascarada), SSM Run Command y la API pública de GitHub |
| [`fase-4-despliegue-frontend/`](fase-4-despliegue-frontend/) | Frontend en Azure App Service (F1, Node 24): recursos, identidad OIDC para GitHub Actions, proxy `/api` hacia el API Gateway, solo HTTPS con TLS 1.3, apagado y encendido, ejecuciones de los pipelines y capturas de la aplicación | Azure CLI (suscripción y tenant enmascarados), `curl` y `openssl s_client` contra `https://billetera-ahorro-front.azurewebsites.net`, capturas del navegador |
| [`fase-4-carga/`](fase-4-carga/) | Pruebas k6: resúmenes, KPIs, series, tablas por endpoint, métricas del servidor, gráficas y dashboards HTML | `k6 run backend/pruebas-carga/<escenario>.js` y `python backend/pruebas-carga/analizar.py <escenario>` |

Los CSV crudos de k6 (`sostenida.csv`, `pico.csv`, `ruptura.csv`, cientos de MB) no se versionan; las series agregadas (`*-serie.csv`) y los resúmenes sí.
