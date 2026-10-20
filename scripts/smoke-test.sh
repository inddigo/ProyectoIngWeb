#!/usr/bin/env bash
# Recorre el flujo completo de extremo a extremo (EP1 + EP2) contra el stack de Docker Compose:
# Fuente Web (Openverse/respaldo) -> FastAPI (limpieza, normalización, deduplicación, métricas)
# -> NestJS (orquestador, Correlation ID) -> PostgreSQL (metadatos e índices) -> Angular(nginx).
# Uso: ./scripts/smoke-test.sh [URL_BASE]   (por defecto http://localhost:8080)
set -euo pipefail

BASE="${1:-http://localhost:8080}"
BAKER_EMAIL="${SEED_BAKER_EMAIL:-pastelero@pasteleria.com}"
BAKER_PASSWORD="${SEED_BAKER_PASSWORD:-pastelero123}"
CLIENT_EMAIL="smoke-$(date +%s)@test.local"

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }
post() { curl -sf -H 'Content-Type: application/json' -H 'X-Correlation-Id: smoke-e2e-001' ${3:+-H "Authorization: Bearer $3"} -X POST "$BASE$1" -d "$2"; }
code() { curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' "$@"; }
check() { if [ "$2" = "$3" ]; then echo "  OK   $1"; else echo "  FAIL $1 (esperado $3, obtenido $2)"; exit 1; fi; }

echo "1. Salud de servicios y observabilidad (Correlation ID + métricas)"
HEALTH=$(curl -sf -H 'X-Correlation-Id: smoke-health-001' "$BASE/health")
echo "$HEALTH" | json "d['services']"
check "correlationId propagado en /health" "$(echo "$HEALTH" | json "d.get('correlationId')")" "smoke-health-001"
check "PostgreSQL disponible" "$(echo "$HEALTH" | json "d['services']['database']")" "up"
check "Python disponible" "$(echo "$HEALTH" | json "d['services']['pythonService']")" "up"
if [ -n "${EXPECTED_REVISION:-}" ]; then
  check "revisión desplegada" "$(echo "$HEALTH" | json "d.get('revision')")" "$EXPECTED_REVISION"
fi

echo "2. Estructuración NLP y recuperación web (NestJS -> FastAPI -> Openverse)"
STRUCT=$(post /api/v1/orders/nlp-structure '{"rawText":"Quiero una torta vegana de chocolate para 20 personas con temática de cumpleaños","domain":"cake"}')
echo "$STRUCT" | json "d['entities']"
check "porciones extraídas" "$(echo "$STRUCT" | json "d['entities']['servings']")" "20"
check "metadatos de extracción presentes" "$(echo "$STRUCT" | json "'latency_ms' in d.get('extraction_meta', {})")" "True"
if [ "${REQUIRE_REAL_WEB:-0}" = "1" ]; then
  check "recuperación real sin respaldo" "$(echo "$STRUCT" | json "d['extraction_meta']['fallback_used']")" "False"
  check "fuente real (sin fixture)" "$(echo "$STRUCT" | json "len(d['web_references']) > 0 and all(r['source'].startswith('Openverse / ') and 'fixture' not in r['source'].lower() for r in d['web_references'])")" "True"
fi

echo "3. Evaluación de información recuperada (endpoint de métricas)"
METRICS=$(curl -sf "$BASE/api/v1/orders/nlp-metrics")
check "métricas de recuperación web disponibles" "$(echo "$METRICS" | json "'web_retrieval' in d and 'nlp_benchmark' in d")" "True"

echo "4. Controles de seguridad y validación"
check "pedido sin token -> 401" "$(code -X POST "$BASE/api/v1/orders" -d '{}')" "401"
check "rubro inválido -> 400" "$(code -X POST "$BASE/api/v1/orders/nlp-structure" -d '{"rawText":"hola mundo","domain":"plomeria"}')" "400"
check "registro como ADMIN -> 400" "$(code -X POST "$BASE/auth/register" -d '{"email":"a@a.cl","password":"password1","name":"A","role":"ADMIN"}')" "400"

echo "5. Cliente se registra y confirma el pedido con metadatos de procedencia (NestJS -> PostgreSQL)"
CLIENT_TOKEN=$(post /auth/register "{\"email\":\"$CLIENT_EMAIL\",\"password\":\"password123\",\"name\":\"Smoke\",\"role\":\"CLIENT\"}" | json "d['access_token']")
ORDER_BODY=$(echo "$STRUCT" | python3 -c "
import sys,json; d=json.load(sys.stdin); e=d['entities']; c=e.pop('confidence_score')
print(json.dumps({'rawText':d['raw_text'],'domain':d['domain'],'attributes':e,'confidenceScore':c,
 'webReferences':[{'title':r['title'],'imageUrl':r['image_url'],'source':r['source'],
  'sourceUrl':r.get('source_url'),'license':r.get('license'),'creator':r.get('creator'),
  'queryUsed':r.get('query_used'),'retrievedAt':r.get('retrieved_at')} for r in d['web_references']]}))")
ORDER_ID=$(post /api/v1/orders "$ORDER_BODY" "$CLIENT_TOKEN" | json "d['id']")
echo "  pedido $ORDER_ID"

echo "6. Consulta de referencias web indexadas en PostgreSQL"
INDEXED=$(curl -sf -H "Authorization: Bearer $CLIENT_TOKEN" "$BASE/api/v1/orders/web-references?domain=cake")
check "referencias indexadas recuperables" "$(echo "$INDEXED" | json "len(d) >= 1")" "True"
check "procedencia persistida" "$(echo "$INDEXED" | json "all(r.get('sourceUrl') and r.get('license') and r.get('retrievedAt') for r in d)")" "True"

echo "7. Profesional cotiza"
BAKER_TOKEN=$(post /auth/login "{\"email\":\"$BAKER_EMAIL\",\"password\":\"$BAKER_PASSWORD\"}" | json "d['access_token']")
check "cliente no puede listar todos los pedidos -> 403" "$(code -H "Authorization: Bearer $CLIENT_TOKEN" "$BASE/api/v1/orders")" "403"
curl -sf -H "Authorization: Bearer $BAKER_TOKEN" "$BASE/api/v1/quotes/calculate/$ORDER_ID" | json "'  estimación por reglas: ' + str(d['suggestedTotal'])"
post /api/v1/quotes "{\"orderId\":\"$ORDER_ID\",\"estimatedPrice\":65000,\"details\":\"Incluye decoración temática\"}" "$BAKER_TOKEN" >/dev/null
check "cotizar dos veces -> 409" "$(code -X POST -H "Authorization: Bearer $BAKER_TOKEN" "$BASE/api/v1/quotes" -d "{\"orderId\":\"$ORDER_ID\",\"estimatedPrice\":1,\"details\":\"x\"}")" "409"

echo "8. Cliente acepta la cotización"
STATUS=$(curl -sf -X PATCH -H 'Content-Type: application/json' -H "Authorization: Bearer $CLIENT_TOKEN" \
  "$BASE/api/v1/orders/$ORDER_ID/status" -d '{"status":"ACCEPTED_BY_CLIENT"}' | json "d['status']")
check "estado final" "$STATUS" "ACCEPTED_BY_CLIENT"

if [ -n "${EVIDENCE_DIR:-}" ]; then
  mkdir -p "$EVIDENCE_DIR"
  printf '%s\n' "$HEALTH" > "$EVIDENCE_DIR/health.json"
  printf '%s\n' "$STRUCT" > "$EVIDENCE_DIR/retrieval.json"
  printf '%s\n' "$METRICS" > "$EVIDENCE_DIR/metrics.json"
  echo "Evidencia guardada (sin tokens ni contraseñas)."
fi
echo "Flujo de extremo a extremo (EP2) completado."

