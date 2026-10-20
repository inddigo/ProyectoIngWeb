#!/usr/bin/env bash
# Ejecutar una vez en Cloud Shell con proyecto y facturación ya habilitados.
set -euo pipefail
PROJECT_ID="${1:?Uso: bash scripts/bootstrap-staging.sh PROJECT_ID [REGION]}"
REGION="${2:-us-central1}"
BUCKET="${PROJECT_ID}-cotiza-tfstate"
SA="cotiza-deployer@${PROJECT_ID}.iam.gserviceaccount.com"
gcloud config set project "$PROJECT_ID"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com serviceusage.googleapis.com storage.googleapis.com \
  run.googleapis.com artifactregistry.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
gcloud iam service-accounts describe "$SA" > /dev/null 2>&1 || \
  gcloud iam service-accounts create cotiza-deployer --display-name='Cotiza staging deployer'
gcloud storage buckets describe "gs://$BUCKET" > /dev/null 2>&1 || \
  gcloud storage buckets create "gs://$BUCKET" --location="$REGION" \
    --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update "gs://$BUCKET" --versioning
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA" --role=roles/storage.objectAdmin > /dev/null
for role in serviceusage.serviceUsageAdmin artifactregistry.admin run.admin cloudsql.admin \
  secretmanager.admin iam.serviceAccountAdmin iam.serviceAccountUser resourcemanager.projectIamAdmin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" \
    --role="roles/$role" --condition=None > /dev/null
done
gcloud iam workload-identity-pools describe cotiza-github --location=global > /dev/null 2>&1 || \
  gcloud iam workload-identity-pools create cotiza-github --location=global --display-name='Cotiza GitHub'
gcloud iam workload-identity-pools providers describe github --location=global \
  --workload-identity-pool=cotiza-github > /dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc github --location=global \
    --workload-identity-pool=cotiza-github --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping='google.subject=assertion.sub,attribute.repository_id=assertion.repository_id' \
    --attribute-condition="assertion.repository_id == '1379962254' && (assertion.ref == 'refs/heads/main' || assertion.ref.startsWith('refs/tags/v'))"
gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/cotiza-github/attribute.repository_id/1379962254" > /dev/null
printf '\nConfigurar Variables en GitHub, ambiente staging:\n'
printf 'GCP_PROJECT_ID=%s\nGCP_REGION=%s\nTF_STATE_BUCKET=%s\nGCP_DEPLOY_SA=%s\n' "$PROJECT_ID" "$REGION" "$BUCKET" "$SA"
printf 'GCP_WIF_PROVIDER=projects/%s/locations/global/workloadIdentityPools/cotiza-github/providers/github\n' "$PROJECT_NUMBER"
