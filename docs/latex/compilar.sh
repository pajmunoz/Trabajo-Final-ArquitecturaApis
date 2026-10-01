#!/usr/bin/env bash
# Compila el informe final: genera los capítulos desde Markdown y produce el PDF.
#   bash docs/latex/compilar.sh
# Requiere: LuaLaTeX, Biber, pandoc y ruby (para leer el contrato OpenAPI).
set -euo pipefail
cd "$(dirname "$0")"

python3 generar_capitulos.py
mkdir -p build
opciones=(-interaction=nonstopmode -halt-on-error -output-directory=build)
lualatex "${opciones[@]}" informe-final.tex >/dev/null
biber --input-directory=build --output-directory=build informe-final >/dev/null
lualatex "${opciones[@]}" informe-final.tex >/dev/null
lualatex "${opciones[@]}" informe-final.tex | grep -E "Output written|LaTeX Warning: (Reference|Citation)" || true

mkdir -p ../../entregables
cp build/informe-final.pdf "../../entregables/Informe-Final-Billetera-de-Ahorro.pdf"
echo "PDF: entregables/Informe-Final-Billetera-de-Ahorro.pdf"
