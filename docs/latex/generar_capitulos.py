#!/usr/bin/env python3
"""Genera los capítulos LaTeX a partir de las fuentes del repositorio.

- Los informes Markdown de docs/informes/ son la fuente única de cada fase:
  aquí se limpian (portada, numeración manual, pies de figura) y se convierten con pandoc.
- La tabla de endpoints del capítulo de la Fase 3 sale de contracts/openapi.yaml.

Requiere pandoc y ruby (para leer el YAML sin dependencias de Python).
"""
import json
import re
import subprocess
from pathlib import Path

LATEX = Path(__file__).resolve().parent
DOCS = LATEX.parent
RAIZ = DOCS.parent
INFORMES = DOCS / "informes"
SALIDA = LATEX / "generados"

# (archivo, salida, línea desde la que empieza el contenido, desplazamiento de títulos)
FUENTES = [
    ("VISION-NEGOCIO.md", "fase1-negocio.tex", r"^\*\*Supuestos", 0),
    ("REQUERIMIENTOS.md", "fase1-requerimientos.tex", r"^## Requerimientos funcionales", 1),
    ("FASE-2-ARQUITECTURA.md", "fase2-arquitectura.tex", r"^## 1\. ", 0),
    ("FASE-4-DESARROLLO.md", "fase4-desarrollo.tex", r"^## 1\. ", 0),
    ("PATRONES-DISENO.md", "anexo-patrones.tex", r"^## 1\. ", 0),
]

SIMBOLOS = {
    "→": r"\ensuremath{\rightarrow}",
    "↔": r"\ensuremath{\leftrightarrow}",
    "≈": r"\ensuremath{\approx}",
    "✅": r"\checkmark{}",
    "🔜": r"\textit{(próximo)}",
}


def limpiar_markdown(texto: str, inicio: str, desplazar: int) -> str:
    lineas = texto.splitlines()
    desde = next(i for i, l in enumerate(lineas) if re.match(inicio, l))
    lineas = lineas[desde:]
    salida = []
    saltar_pie = False
    for linea in lineas:
        # La bibliografía va consolidada al final del informe.
        if re.match(r"^## (\d+\. )?Referencias", linea):
            break
        if saltar_pie and re.match(r"^\*Ilustración \d+\..*\*$", linea.strip()):
            saltar_pie = False
            continue
        if linea.strip() == "---":
            continue
        # Títulos: sin numeración manual (la pone LaTeX) y con el nivel ajustado.
        m = re.match(r"^(#+) (?:\d+(?:\.\d+)*\.? )?(.*)$", linea)
        if m:
            nivel = len(m.group(1)) + desplazar
            linea = "#" * nivel + " " + m.group(2)
        # Figura: el texto alternativo pasa a ser el título; se elimina el pie en cursiva.
        m = re.match(r"^!\[(?:Ilustración \d+\. )?([^\]]*)\]\(([^)]+)\)$", linea.strip())
        if m:
            linea = f"![{m.group(1)}]({m.group(2)}){{width=95%}}"
            saltar_pie = True
        # Pie de tabla "*Tabla N. Texto*" → título de tabla de pandoc.
        m = re.match(r"^\*Tabla \d+\. (.*)\*$", linea.strip())
        if m:
            linea = f": {m.group(1)}"
        salida.append(linea)
    return "\n".join(salida) + "\n"


def a_latex(markdown: str, directorio: Path) -> str:
    resultado = subprocess.run(
        ["pandoc", "-f", "markdown-auto_identifiers+lists_without_preceding_blankline", "-t", "latex",
         "--top-level-division=chapter", "--syntax-highlighting=none", "--columns=60"],
        input=markdown, capture_output=True, text=True, check=True, cwd=directorio,
    )
    tex = resultado.stdout
    for simbolo, reemplazo in SIMBOLOS.items():
        tex = tex.replace(simbolo, reemplazo)
    # Bloques de código con listings (corta las líneas largas); el código en línea sigue como \texttt.
    tex = tex.replace("\\begin{verbatim}", "\\begin{lstlisting}").replace("\\end{verbatim}", "\\end{lstlisting}")
    # Permite cortar identificadores largos (sp_procesar_debitos_...) en los guiones bajos.
    tex = tex.replace("\\_", "\\_\\allowbreak{}")
    # Las rutas de imágenes son relativas a docs/informes; desde docs/latex quedan iguales (../...).
    return tex


def tabla_endpoints() -> str:
    contrato = json.loads(
        subprocess.run(
            ["ruby", "-ryaml", "-rjson", "-e", "puts JSON.dump(YAML.load_file(ARGV[0]))", str(RAIZ / "contracts" / "openapi.yaml")],
            capture_output=True, text=True, check=True,
        ).stdout
    )
    filas = []
    for ruta, operaciones in contrato["paths"].items():
        for metodo in ("get", "post", "patch", "put", "delete"):
            op = operaciones.get(metodo)
            if not op:
                continue
            seguridad = op.get("security", contrato.get("security", []))
            scopes = ", ".join(s for req in seguridad for v in req.values() for s in v) or "público"
            codigos = ", ".join(sorted(op["responses"].keys()))
            ruta_tex = ruta.replace("_", r"\_").replace("{", r"\{").replace("}", r"\}").replace("/", r"/\allowbreak{}")
            resumen = op.get("summary", "").replace("&", r"\&")
            filas.append(rf"\texttt{{{metodo.upper()}}} & \texttt{{{ruta_tex}}} & {resumen} & \texttt{{{scopes}}} & {codigos} \\")
    cuerpo = "\n".join(filas)
    return rf"""{{\let\small\footnotesize\setlength{{\tabcolsep}}{{3pt}}
\begin{{longtable}}{{@{{}}>{{\raggedright}}p{{1.1cm}}>{{\raggedright}}p{{4.5cm}}>{{\raggedright}}p{{3.9cm}}>{{\raggedright}}p{{3.0cm}}>{{\raggedright\arraybackslash}}p{{2.4cm}}@{{}}}}
\caption{{Operaciones del contrato OpenAPI (generada desde contracts/openapi.yaml)}}\label{{tab:endpoints}}\\
\toprule Método & Ruta & Operación & Scope requerido & Respuestas \\ \midrule
\endfirsthead
\toprule Método & Ruta & Operación & Scope requerido & Respuestas \\ \midrule
\endhead
\bottomrule
\endlastfoot
{cuerpo}
\end{{longtable}}}}
"""


def main() -> None:
    SALIDA.mkdir(exist_ok=True)
    for archivo, destino, inicio, desplazar in FUENTES:
        markdown = limpiar_markdown((INFORMES / archivo).read_text(encoding="utf-8"), inicio, desplazar)
        (SALIDA / destino).write_text(a_latex(markdown, INFORMES), encoding="utf-8")
        print(f"generado {destino}")
    (SALIDA / "fase3-endpoints.tex").write_text(tabla_endpoints(), encoding="utf-8")
    print("generado fase3-endpoints.tex")


if __name__ == "__main__":
    main()
