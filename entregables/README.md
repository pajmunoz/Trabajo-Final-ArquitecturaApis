# Entregables

Estado de cada entregable según el checklist de [`TAREA-FINAL.md`](../docs/contexto/TAREA-FINAL.md).

**Leyenda:** ✅ listo · 🟡 en curso · ⬜ pendiente

## Documento final

| Entregable | Estado | Dónde |
|---|---|---|
| Informe final en PDF (todas las fases, evidencias en anexos) | 🟡 Falta el capítulo de integración con el frontend, los integrantes y la distribución del trabajo | [`Informe-Final-Billetera-de-Ahorro.pdf`](Informe-Final-Billetera-de-Ahorro.pdf) |

## Por criterio de la rúbrica

| Criterio | Entregable | Estado | Dónde |
|---|---|---|---|
| 1. Negocio y anatomía | Visión del producto, monetización, cadena de valor, anatomía y naturaleza de la API | ✅ | [`VISION-NEGOCIO.md`](../docs/informes/VISION-NEGOCIO.md), capítulo 2 del informe |
| 2. Arquitectura y patrones | Diagramas C4 y ArchiMate, ISO/IEC 25010, patrones justificados (paginación, filtros, resiliencia) | ✅ | [`FASE-2-ARQUITECTURA.md`](../docs/informes/FASE-2-ARQUITECTURA.md), [`docs/diagramas/`](../docs/diagramas/) |
| 3. Modelo y contrato | Contrato OpenAPI 3.1 válido, autocontenido, con seguridad, paginación y versionamiento | ✅ | [`contracts/openapi.yaml`](../contracts/openapi.yaml), capítulo 4 del informe |
| 4. Implementación, seguridad y pruebas | Backend con JWT RS256 y scopes, cobertura > 80 % (97,9 %), reporte de pruebas de carga | ✅ | [`backend/`](../backend/), [`docs/evidencias/`](../docs/evidencias/) |
| 5. Despliegue | Docker Compose, pipeline CI/CD, API pública y Swagger | ✅ | [`.github/workflows/`](../.github/workflows/), `http://3.151.57.252/docs/` |
| 5. Sustentación | División del trabajo documentada, preparación de todos los integrantes | ⬜ | Anexo C del informe (por completar) |

## Pendientes antes de entregar

1. ⬜ Integrar el frontend con la API y documentar las pruebas de extremo a extremo (capítulo 6).
2. ⬜ Completar integrantes y fecha en la portada y en los informes de cada fase.
3. ⬜ Completar la distribución del trabajo (Anexo C).
4. ⬜ Encender la instancia de AWS para la sustentación (Actions → *AWS - encender o apagar*).
