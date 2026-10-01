#!/usr/bin/env bash
# Despliega (o actualiza) la Billetera de Ahorro en la instancia EC2.
# Lo ejecuta SSM Run Command desde GitHub Actions; no requiere SSH.
#   desplegar.sh <imagen-ecr:tag>
# Los secretos se leen de SSM Parameter Store y nunca se imprimen.
set -euo pipefail

IMAGEN="${1:?Uso: desplegar.sh <imagen>}"
REGION="${AWS_REGION:-us-east-2}"
DIR=/opt/billetera
cd "$DIR"

parametro() {
  local valor
  valor=$(aws ssm get-parameter --region "$REGION" --name "/billetera-ahorro/$1" --with-decryption --query Parameter.Value --output text)
  if [ -z "$valor" ]; then
    echo "El parámetro /billetera-ahorro/$1 está vacío o no se pudo leer" >&2
    exit 1
  fi
  printf '%s\n' "$valor"
}

echo "==> Leyendo secretos de SSM"
mkdir -p keys kong
# Se captura en una variable antes de escribir: el AWS CLI de snap no escribe bien
# cuando su salida se redirige directamente a un archivo.
privada=$(parametro JWT_PRIVATE_KEY)
publica=$(parametro JWT_PUBLIC_KEY)
printf '%s\n' "$privada" > keys/jwt-private.pem
printf '%s\n' "$publica" > keys/jwt-public.pem
# El contenedor corre como el usuario node (uid 1000).
chown 1000:1000 keys/*.pem
chmod 600 keys/jwt-private.pem
chmod 644 keys/jwt-public.pem

pg=$(parametro POSTGRES_PASSWORD)
rmq=$(parametro RABBITMQ_PASSWORD)
mongo=$(parametro MONGO_URI)
umask 077
cat > .env <<EOF
IMAGEN='$IMAGEN'
POSTGRES_PASSWORD='$pg'
RABBITMQ_PASSWORD='$rmq'
MONGO_URI='$mongo'
EOF
umask 022

echo "==> Generando la configuración de Kong con la clave pública"
python3 - <<'PY'
plantilla = open('kong.template.yml', encoding='utf-8').read()
pem = '\n'.join('          ' + linea for linea in open('keys/jwt-public.pem', encoding='utf-8').read().strip().splitlines())
open('kong/kong.yml', 'w', encoding='utf-8').write(plantilla.replace('__JWT_PUBLIC_KEY__', '|\n' + pem))
PY

echo "==> Levantando servicios con $IMAGEN"
docker compose -f docker-compose.prod.yml --env-file .env up -d --remove-orphans

echo "==> Verificando la API a través de Kong"
for intento in $(seq 1 30); do
  if curl -fsS -o /dev/null http://localhost/v1/tarifas; then
    echo "API disponible (intento $intento)"
    docker compose -f docker-compose.prod.yml --env-file .env ps --format '{{.Service}}: {{.State}}'
    docker image prune -f >/dev/null
    exit 0
  fi
  sleep 3
done

echo "La API no respondió a tiempo" >&2
docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env logs --tail 30 api auth kong
exit 1
