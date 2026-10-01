#!/usr/bin/env bash
# Captura evidencias de seguridad y funcionamiento contra la API desplegada.
#   bash docs/evidencias/generar-evidencias-api.sh [URL]   (por defecto http://3.151.57.252)
# Los tokens se recortan en la salida; no se guardan credenciales.
set -uo pipefail

G="${1:-http://3.151.57.252}"
HOST="${G#*://}"
DIR="$(cd "$(dirname "$0")" && pwd)/fase-4-seguridad"
mkdir -p "$DIR"
J='content-type: application/json'
uuid() { python3 -c 'import uuid;print(uuid.uuid4())'; }
token() { curl -s -X POST "$G/v1/auth/token" -H "$J" -d "{\"grantType\":\"password\",\"email\":\"$1\",\"contrasena\":\"$2\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])'; }
# Muestra status, cabeceras relevantes y cuerpo (tokens recortados).
mostrar() {
  sed -E 's/("(accessToken|refreshToken)":")([^"]{12})[^"]*/\1\3…(recortado)/g; s/(Bearer )([A-Za-z0-9_-]{12})[A-Za-z0-9._-]*/\1\2…/g' \
    | grep -viE '^(date|connection|via|x-kong-proxy-latency|x-kong-upstream-latency|content-length|etag: W/"[0-9a-f]{2,})' || true
}
seccion() { printf '\n\n===== %s =====\n$ %s\n' "$1" "$2"; }

{
  echo "Evidencias de seguridad — $G — $(date -u +%FT%TZ)"

  seccion "1. Login correcto: access token JWT RS256 (15 min) + refresh token" "POST /v1/auth/token (password)"
  curl -s -i -X POST "$G/v1/auth/token" -H "$J" -d '{"grantType":"password","email":"pablo.jara@email.com","contrasena":"goallet123"}' | mostrar
  TOKEN=$(token pablo.jara@email.com goallet123)
  echo; echo "Cabecera y claims del JWT (decodificados, sin la firma):"
  python3 - "$TOKEN" <<'PY'
import base64, json, sys
def b64(s): return json.loads(base64.urlsafe_b64decode(s + '=' * (-len(s) % 4)))
h, p, _ = sys.argv[1].split('.')
print(json.dumps(b64(h)), json.dumps(b64(p), ensure_ascii=False), sep='\n')
PY

  seccion "2. Credenciales inválidas → 401 problem+json" "POST /v1/auth/token (contraseña incorrecta)"
  curl -s -i -X POST "$G/v1/auth/token" -H "$J" -d '{"grantType":"password","email":"pablo.jara@email.com","contrasena":"incorrecta"}' | mostrar

  seccion "3. Sin token → 401 en el Gateway" "GET /v1/planes-ahorro"
  curl -s -i "$G/v1/planes-ahorro" | mostrar

  seccion "4. Token con firma falsificada → 401" "GET /v1/planes-ahorro (Authorization: Bearer <token alterado>)"
  FALSO="${TOKEN%.*}.firmaFalsificadaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
  curl -s -i "$G/v1/planes-ahorro" -H "Authorization: Bearer $FALSO" | mostrar

  seccion "5. Scope insuficiente → 403 (OPERADOR intenta crear un plan)" "POST /v1/planes-ahorro con token de OPERADOR"
  OP=$(token operador@billetera.test operador123)
  curl -s -i -X POST "$G/v1/planes-ahorro" -H "$J" -H "Authorization: Bearer $OP" -H "Idempotency-Key: $(uuid)" -d '{}' | mostrar

  seccion "6. Titularidad (ABAC): plan inexistente o ajeno → 404" "GET /v1/planes-ahorro/{id ajeno}"
  curl -s -i "$G/v1/planes-ahorro/$(uuid)" -H "Authorization: Bearer $TOKEN" | mostrar

  seccion "7. Validación del contrato → 400 con detalle por campo" "POST /v1/planes-ahorro (cuerpo inválido)"
  curl -s -i -X POST "$G/v1/planes-ahorro" -H "$J" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuid)" -d '{"nombre":"","diaDebito":31,"montoMetaCentavos":-5}' | mostrar

  CLAVE=$(uuid)
  PLAN_JSON='{"nombre":"Evidencia","icono":"savings","montoMetaCentavos":120000,"fechaObjetivo":"2027-12-01","diaDebito":10,"cuentaDebitoId":"0c6f2a9e-1b3d-4e5f-8a7b-6c5d4e3f2a1b","bloqueado":true}'
  seccion "8. Idempotency-Key: primera creación → 201 + Location + ETag" "POST /v1/planes-ahorro (Idempotency-Key: $CLAVE)"
  R=$(curl -s -i -X POST "$G/v1/planes-ahorro" -H "$J" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $CLAVE" -d "$PLAN_JSON")
  echo "$R" | mostrar
  PLAN=$(echo "$R" | tail -1 | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

  seccion "9. Idempotency-Key: reintento idéntico → misma respuesta, Idempotent-Replayed: true" "POST /v1/planes-ahorro (misma clave y cuerpo)"
  curl -s -i -X POST "$G/v1/planes-ahorro" -H "$J" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $CLAVE" -d "$PLAN_JSON" | grep -iE '^HTTP|^location|^idempotent'

  seccion "10. Idempotency-Key reutilizada con otro cuerpo → 409" "POST /v1/planes-ahorro (misma clave, otro cuerpo)"
  curl -s -i -X POST "$G/v1/planes-ahorro" -H "$J" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $CLAVE" -d "${PLAN_JSON/Evidencia/Otro}" | mostrar

  seccion "11. Patrón State: retiro en plan bloqueado → 409 RETIRO_NO_PERMITIDO" "POST /v1/planes-ahorro/$PLAN/retiros"
  curl -s -i -X POST "$G/v1/planes-ahorro/$PLAN/retiros" -H "$J" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuid)" -d '{"montoCentavos":100}' | mostrar

  seccion "12. Concurrencia optimista: If-Match desactualizado → 412" "PATCH /v1/planes-ahorro/$PLAN (If-Match: W/\"v0\")"
  curl -s -i -X PATCH "$G/v1/planes-ahorro/$PLAN" -H 'content-type: application/merge-patch+json' -H "Authorization: Bearer $TOKEN" -H 'If-Match: W/"v0"' -d '{"diaDebito":5}' | mostrar

  seccion "13. Aporte asíncrono → 202 + Location; luego EJECUTADO (DebitoSolicitado → Core → DebitoEjecutado)" "POST /v1/planes-ahorro/$PLAN/aportes"
  A=$(curl -s -i -X POST "$G/v1/planes-ahorro/$PLAN/aportes" -H "$J" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuid)" -d '{"montoCentavos":500}')
  echo "$A" | mostrar
  LOC=$(echo "$A" | grep -i '^location:' | tr -d '\r' | awk '{print $2}')
  sleep 3; echo; echo "\$ GET $LOC (3 s después)"; curl -s "$G$LOC" -H "Authorization: Bearer $TOKEN"; echo

  seccion "14. Limpieza: cancelación con devolución del saldo" "POST /v1/planes-ahorro/$PLAN/cancelacion"
  curl -s -X POST "$G/v1/planes-ahorro/$PLAN/cancelacion" -H "$J" -H "Authorization: Bearer $TOKEN" -H "Idempotency-Key: $(uuid)" -d '{}' | python3 -c 'import sys,json;d=json.load(sys.stdin);print({k:d[k] for k in ("saldoCentavos","interesesPerdidosCentavos","montoDevueltoCentavos","estadoDevolucion")}, d["plan"]["estado"])'

  seccion "15. Refresh token con rotación: el usado deja de servir → 401" "POST /v1/auth/token (refresh_token, dos veces)"
  RT=$(curl -s -X POST "$G/v1/auth/token" -H "$J" -d '{"grantType":"password","email":"pablo.jara@email.com","contrasena":"goallet123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["refreshToken"])')
  echo "Primer uso:";  curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$G/v1/auth/token" -H "$J" -d "{\"grantType\":\"refresh_token\",\"refreshToken\":\"$RT\"}"
  echo "Reutilizado:"; curl -s -o /dev/null -w "HTTP %{http_code}\n" -X POST "$G/v1/auth/token" -H "$J" -d "{\"grantType\":\"refresh_token\",\"refreshToken\":\"$RT\"}"

  seccion "16. TLS: el Gateway negocia TLS 1.3 y rechaza TLS 1.2" "openssl s_client -connect $HOST:443"
  echo "--- con -tls1_3:"; echo | openssl s_client -connect "$HOST:443" -tls1_3 2>/dev/null | grep -E '^(New|Protocol|    Protocol|    Cipher)' | head -3
  echo "--- con -tls1_2:"; echo | openssl s_client -connect "$HOST:443" -tls1_2 2>&1 | grep -iE 'alert|error|New,|Cipher is' | head -3

  seccion "17. Endpoint público: caché del Gateway (X-Cache-Status) y rate limit (RateLimit-Remaining)" "GET /v1/tarifas (dos veces)"
  for _ in 1 2; do curl -s -i "$G/v1/tarifas" | grep -iE '^HTTP|^x-cache-status|^ratelimit-remaining|^cache-control'; echo; done

  seccion "18. Rate limiting del login (30/min por IP) → 429 + Retry-After" "40 × POST /v1/auth/token con credenciales incorrectas"
  for i in $(seq 1 40); do curl -s -o /dev/null -w '%{http_code} ' -X POST "$G/v1/auth/token" -H "$J" -d '{"grantType":"password","email":"x@x.com","contrasena":"incorrecta"}'; done; echo
  curl -s -i -X POST "$G/v1/auth/token" -H "$J" -d '{"grantType":"password","email":"x@x.com","contrasena":"incorrecta"}' | grep -iE '^HTTP|^retry-after|^ratelimit|message'
} > "$DIR/evidencias-seguridad.txt" 2>&1

echo "Evidencias guardadas en $DIR/evidencias-seguridad.txt"
