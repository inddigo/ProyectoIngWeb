# Staging EP2

## Estado y requisito externo

El equipo todavía no dispone de un proyecto GCP con facturación ni servidor. La infraestructura y el despliegue están preparados; **no existe aún una URL pública verificada**. CI con fuente sintética no acredita staging ni recuperación web real.

## Arquitectura

- Cloud Run web: Angular/Ionic/PWA sobre nginx, público. `BACKEND_ORIGIN` recibe la URL real de la API sin reconstruir el frontend.
- Cloud Run API: NestJS público, PostgreSQL mediante socket Cloud SQL y secretos en Secret Manager. `/health` incluye el SHA desplegado.
- Cloud Run NLP: FastAPI con 1 GiB. IAM permite invocarlo solo a la cuenta del backend. NestJS obtiene un ID token con la audiencia del servicio. No requiere conector VPC ni acceso sin autenticación.
- Cloud SQL PostgreSQL 16, `db-f1-micro`, backups y migraciones versionadas.
- Artifact Registry: las imágenes exactas que aprobaron escaneo e integración, etiquetadas con el SHA.
- Cloud Storage: estado Terraform privado con versionado y bloqueo.

## Preparación de la cuenta (una vez)

1. Crear o elegir un proyecto en [Google Cloud](https://console.cloud.google.com/projectcreate), habilitar facturación y revisar el presupuesto. Cloud SQL, almacenamiento y otros recursos pueden generar cargos; no se presenta esta configuración como gratuita.
2. Abrir Cloud Shell y clonar la rama o commit del repositorio que contiene estas correcciones.
3. Revisar y ejecutar `bash scripts/bootstrap-staging.sh ID_REAL_DEL_PROYECTO`. Crea el bucket privado, cuenta de despliegue y federación OIDC; no crea todavía Cloud SQL. El proyecto de ejemplo `cotiza-staging` no representa una cuenta existente.
4. Crear el ambiente GitHub `staging`. Configurar las Variables impresas por el script: `GCP_PROJECT_ID`, `GCP_REGION`, `TF_STATE_BUCKET`, `GCP_DEPLOY_SA`, `GCP_WIF_PROVIDER`.
5. Configurar Secrets `DB_PASSWORD` y `JWT_SECRET` (JWT: mínimo 32 caracteres). No se necesitan claves JSON ni tokens GCP permanentes.
6. Revisar los permisos del ambiente y aprobar la creación de recursos antes del primer despliegue. La cuenta de despliegue administra los tipos de recursos necesarios dentro del proyecto; las aplicaciones tienen cuentas con permisos menores.

La federación está restringida al identificador numérico del repositorio y a `main` o tags `v*`. Una PR no recibe credenciales de despliegue.

## Despliegue automático

Al integrar en `main`, publicar un tag `v*` o ejecutar manualmente el workflow sobre `main`:

1. Se ejecutan lint, pruebas, seguridad, Terraform e integración reproducible con `docker-compose.ci.yml`.
2. El job `docker` exporta las imágenes ya verificadas. No se reconstruyen imágenes diferentes para desplegar.
3. `deploy-staging` exige la configuración obligatoria y falla si falta.
4. OIDC autentica el job. `scripts/deploy-staging.sh` configura estado remoto, crea/actualiza el registro, publica las imágenes y aplica un plan Terraform guardado.
5. Se verifican salud, SHA desplegado, recuperación **real** sin respaldo ni fixture, persistencia, consulta y cotización usando `REQUIRE_REAL_WEB=1`.
6. URL y commit quedan en el resumen del workflow; los JSON de salud, recuperación y métricas se guardan como `ep2-staging-evidence`.

La falta de respuesta de Openverse hace fallar esta verificación; revisar conectividad y reintentar. No sustituirla por imágenes estáticas para aprobar.

## Validación sin crear recursos

```bash
cd terraform
terraform fmt -check -recursive
terraform init -backend=false -input=false
terraform validate
GOOGLE_OAUTH_ACCESS_TOKEN=offline-plan \
TF_VAR_db_password=ci-placeholder TF_VAR_jwt_secret=ci-placeholder \
terraform plan -refresh=false -lock=false -input=false \
  -var-file=environments/staging.tfvars.example
```

El plan sin refresco valida la estructura; no confirma permisos, disponibilidad externa ni despliegue real.

## Operación

- Swagger NestJS: `URL_STAGING/api/docs`; JSON: `URL_STAGING/api/docs-json`.
- Salud: `URL_STAGING/health`; métricas: `URL_STAGING/api/v1/orders/nlp-metrics`.
- Verificación manual: `REQUIRE_REAL_WEB=1 EXPECTED_REVISION=SHA bash scripts/smoke-test.sh URL_STAGING`.
- Usar datos ficticios y cuentas de demostración solo en staging.
- Para recuperar una versión, revisar un plan con las imágenes del SHA anterior. Las migraciones requieren evaluar compatibilidad; no revertir datos automáticamente.
- La eliminación de Cloud SQL o recursos con datos requiere decisión explícita del equipo.

Referencias: [identidad entre servicios](https://docs.cloud.google.com/run/docs/authenticating/service-to-service), [estado Terraform remoto](https://docs.cloud.google.com/docs/terraform/resource-management/store-state).
