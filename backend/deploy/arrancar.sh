#!/usr/bin/env bash
# Primer paso en la instancia: trae la imagen de ECR, extrae los archivos de
# despliegue que vienen dentro de ella y ejecuta desplegar.sh.
#   arrancar.sh <imagen-ecr:tag>
set -euo pipefail

IMAGEN="${1:?Uso: arrancar.sh <imagen>}"
REGION="${AWS_REGION:-us-east-2}"
REGISTRO="${IMAGEN%%/*}"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REGISTRO" >/dev/null
docker pull -q "$IMAGEN"
mkdir -p /opt/billetera
docker run --rm --entrypoint sh "$IMAGEN" -c 'tar -C /app/deploy -cf - .' | tar -C /opt/billetera -xf -
bash /opt/billetera/desplegar.sh "$IMAGEN"
