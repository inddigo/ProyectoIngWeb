#!/usr/bin/env bash
# Recorre el flujo mínimo de extremo a extremo contra el stack de Docker Compose:
# Angular(nginx) -> NestJS -> FastAPI y NestJS -> PostgreSQL.
# Uso: ./scripts/smoke-test.sh [URL_BASE]   (por defecto http://localhost:8080)
set -euo pipefail

BASE="${1:-http://localhost:8080}"
BAKER_EMAIL="${SEED_BAKER_EMAIL:-pastelero@pasteleria.com}"
BAKER_PASSWORD="${SEED_BAKER_PASSWORD:-pastelero123}"
CLIENT_EMAIL="smoke-$(date +%s)@test.local"

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }
post() { curl -sf -H 'Content-Type: application/json' ${3:+-H "Authorization: Bearer $3"} -X POST "$BASE$1" -d "$2"; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' "$@"; }
check() { if [ "$2" = "$3" ]; then echo "  OK   $1"; else echo "  FAIL $1 (esperado $3, obtenido $2)"; exit 1; fi; }

echo "1. Salud de servicios"
curl -sf "$BASE/health" | json "d['services']"

echo "2. Estructuración NLP (NestJS -> FastAPI)"
STRUCT=$(post /api/v1/orders/nlp-structure '{"rawText":"Quiero una torta vegana de chocolate para 20 personas con temática de Batman","domain":"cake"}')
echo "$STRUCT" | json "d['entities']"
check "porciones extraídas" "$(echo "$STRUCT" | json "d['entities']['servings']")" "20"

echo "3. Controles de seguridad y validación"
check "pedido sin token -> 401" "$(code -X POST "$BASE/api/v1/orders" -d '{}')" "401"
check "rubro inválido -> 400" "$(code -X POST "$BASE/api/v1/orders/nlp-structure" -d '{"rawText":"hola mundo","domain":"plomeria"}')" "400"
check "registro como ADMIN -> 400" "$(code -X POST "$BASE/auth/register" -d '{"email":"a@a.cl","password":"password1","name":"A","role":"ADMIN"}')" "400"

echo "4. Cliente se registra y confirma el pedido (NestJS -> PostgreSQL)"
CLIENT_TOKEN=$(post /auth/register "{\"email\":\"$CLIENT_EMAIL\",\"password\":\"password123\",\"name\":\"Smoke\",\"role\":\"CLIENT\"}" | json "d['access_token']")
ORDER_BODY=$(echo "$STRUCT" | python3 -c "
import sys,json; d=json.load(sys.stdin); e=d['entities']; c=e.pop('confidence_score')
print(json.dumps({'rawText':d['raw_text'],'domain':d['domain'],'attributes':e,'confidenceScore':c,
 'webReferences':[{'title':r['title'],'imageUrl':r['image_url'],'source':r['source']} for r in d['web_references']]}))")
ORDER_ID=$(post /api/v1/orders "$ORDER_BODY" "$CLIENT_TOKEN" | json "d['id']")
echo "  pedido $ORDER_ID"

echo "5. Profesional cotiza"
BAKER_TOKEN=$(post /auth/login "{\"email\":\"$BAKER_EMAIL\",\"password\":\"$BAKER_PASSWORD\"}" | json "d['access_token']")
check "cliente no puede listar todos los pedidos -> 403" "$(code -H "Authorization: Bearer $CLIENT_TOKEN" "$BASE/api/v1/orders")" "403"
curl -sf -H "Authorization: Bearer $BAKER_TOKEN" "$BASE/api/v1/quotes/calculate/$ORDER_ID" | json "'  estimación por reglas: ' + str(d['suggestedTotal'])"
post /api/v1/quotes "{\"orderId\":\"$ORDER_ID\",\"estimatedPrice\":65000,\"details\":\"Incluye decoración temática\"}" "$BAKER_TOKEN" >/dev/null
check "cotizar dos veces -> 409" "$(code -X POST -H "Authorization: Bearer $BAKER_TOKEN" "$BASE/api/v1/quotes" -d "{\"orderId\":\"$ORDER_ID\",\"estimatedPrice\":1,\"details\":\"x\"}")" "409"

echo "6. Cliente acepta la cotización"
STATUS=$(curl -sf -X PATCH -H 'Content-Type: application/json' -H "Authorization: Bearer $CLIENT_TOKEN" \
  "$BASE/api/v1/orders/$ORDER_ID/status" -d '{"status":"ACCEPTED_BY_CLIENT"}' | json "d['status']")
check "estado final" "$STATUS" "ACCEPTED_BY_CLIENT"

echo "Flujo de extremo a extremo completado."
