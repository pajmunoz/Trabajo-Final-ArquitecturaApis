# Diagramas C4 (Structurizr DSL)

- `workspace.dsl`: un solo modelo con dos vistas, **Contexto** y **Contenedores**.
- `export/structurizr-Contexto.mmd` y `export/structurizr-Contenedores.mmd`: exportación a Mermaid.

Para verlo, pegue `workspace.dsl` en https://playground.structurizr.com, o levante Structurizr Lite sin Docker (ver abajo) y abra http://localhost:8080.
Para regenerar el Mermaid: `structurizr-cli export -workspace diagramas/workspace.dsl -format mermaid -output diagramas/export`.

## Exportar imágenes (PNG/SVG) sin Docker

Requiere `brew install structurizr openjdk@21` (Structurizr necesita Java 21). Desde la raíz del repo:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
structurizr local diagramas &          # sirve el workspace en http://localhost:8080
structurizr export -f png -url http://localhost:8080/workspace/1/diagrams -o diagramas/export/img
structurizr export -f svg -url http://localhost:8080/workspace/1/diagrams -o diagramas/export/img
```

La primera exportación descarga el navegador de Playwright. Deja `Contexto.png` y `Contenedores.png` (más `.svg` y leyendas) en `export/img/`, que son las que usa el informe de la Fase 2. La exportación PNG también genera `*-key.png`, que no se usan.
