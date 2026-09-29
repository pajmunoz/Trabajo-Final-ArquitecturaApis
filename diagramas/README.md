# Diagramas C4 (Structurizr DSL)

- `workspace.dsl`: un solo modelo con dos vistas, **Contexto** y **Contenedores**.
- `export/structurizr-Contexto.mmd` y `export/structurizr-Contenedores.mmd`: exportación a Mermaid.

Para verlo, pegue `workspace.dsl` en https://playground.structurizr.com, o levante Structurizr Lite sin Docker (ver abajo) y abra http://localhost:8080.
Para regenerar el Mermaid: `structurizr-cli export -workspace diagramas/workspace.dsl -format mermaid -output diagramas/export`.

## Exportar imágenes (PNG/SVG) sin Docker

```bash
bash ~/.claude-somnio/skills/structurizr-export/scripts/lite.sh diagramas 8080
node ~/.claude-somnio/skills/structurizr-export/scripts/exportar.js http://localhost:8080 diagramas/export/img
```

Deja `Contexto.png` y `Contenedores.png` (más `.svg` y leyendas) en `export/img/`, que son las que usa el informe de la Fase 2.
