#!/usr/bin/env bash
# Despliega las imágenes ya escaneadas y probadas por el job docker.
set -euo pipefail
for name in GCP_PROJECT_ID GCP_REGION TF_STATE_BUCKET APP_REVISION TF_VAR_db_password TF_VAR_jwt_secret; do
  if [ -z "${!name:-}" ]; then
    echo "::error::Falta configuración obligatoria: $name"
    exit 1
  fi
done
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/terraform"
export TF_VAR_project_id="$GCP_PROJECT_ID"
export TF_VAR_region="$GCP_REGION"
export TF_VAR_environment=staging
export TF_VAR_image_tag="$APP_REVISION"

# El bucket de estado se provisiona una sola vez siguiendo docs/staging.md.
cat > backend.generated.tf <<'EOF'
terraform {
  backend "gcs" {}
}
EOF
terraform init -input=false -reconfigure \
  -backend-config="bucket=$TF_STATE_BUCKET" -backend-config="prefix=cotiza/staging"
terraform validate

# Primer despliegue: el registro debe existir antes de subir las imágenes.
terraform plan -input=false -target=module.registry -out=registry.tfplan
terraform apply -input=false -auto-approve registry.tfplan
REGISTRY="$(terraform output -raw artifact_registry)"
gcloud auth configure-docker "$GCP_REGION-docker.pkg.dev" --quiet
for service in frontend backend-nestjs python-service; do
  docker tag "ingweb-$service:latest" "$REGISTRY/$service:$APP_REVISION"
  docker push "$REGISTRY/$service:$APP_REVISION"
done
terraform plan -input=false -out=staging.tfplan
terraform apply -input=false -auto-approve staging.tfplan
STAGING_URL="$(terraform output -raw frontend_url)"
cd "$ROOT"

# Reintentos acotados mientras inicia la primera revisión.
for attempt in $(seq 1 12); do
  if curl -fsS --max-time 30 "$STAGING_URL/health" > /dev/null; then
    break
  fi
  sleep 10
done
export EXPECTED_REVISION="$APP_REVISION"
export REQUIRE_REAL_WEB=1
bash scripts/smoke-test.sh "$STAGING_URL"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  printf '## Staging EP2\n\n- URL: %s\n- Commit: `%s`\n- Flujo real y persistencia: verificados.\n' \
    "$STAGING_URL" "$APP_REVISION" >> "$GITHUB_STEP_SUMMARY"
fi
