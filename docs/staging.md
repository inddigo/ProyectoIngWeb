# Ambiente de staging

Ambiente previo a producción, en Google Cloud, definido con Terraform en [`terraform/`](../terraform).

## Componentes

| Recurso | Nombre | Notas |
|---|---|---|
| Artifact Registry | `cotiza-staging` | Imágenes `frontend`, `backend-nestjs`, `python-service` etiquetadas con el SHA del commit |
| Cloud Run | `cotiza-staging-web` | nginx + Angular, público |
| Cloud Run | `cotiza-staging-api` | NestJS, público, conecta a Cloud SQL por socket `/cloudsql` |
| Cloud Run | `cotiza-staging-nlp` | FastAPI, `INGRESS_TRAFFIC_INTERNAL_ONLY`, solo la cuenta de servicio de la API puede invocarlo |
| Cloud SQL | `cotiza-staging-db` | PostgreSQL 16, `db-f1-micro`, backups activos |
| Secret Manager | `cotiza-staging-jwt-secret`, `cotiza-staging-database-url` | Solo legibles por la cuenta de servicio de la API |

Cada servicio tiene su **propia cuenta de servicio** (mínimo privilegio). En staging se cargan
datos de demostración (`SEED_DEMO_DATA=true`); en producción se desactiva.

## Estructura de Terraform

```
terraform/
├── versions.tf        # versión de Terraform, proveedor google, backend remoto (GCS, comentado)
├── variables.tf       # entradas (project_id, region, environment, image_tag, secretos sensibles)
├── main.tf            # APIs, registry, Cloud SQL, secretos, 3 servicios Cloud Run, IAM
├── outputs.tf         # URLs de los servicios, registry, conexión SQL
├── environments/
│   └── staging.tfvars.example
└── modules/
    ├── cloudrun/      # servicio + cuenta de servicio + IAM invoker
    ├── cloudsql/      # instancia, base de datos y usuario
    └── registry/      # repositorio Docker
```

## Uso

```bash
cd terraform
cp environments/staging.tfvars.example environments/staging.tfvars   # ignorado por git
export TF_VAR_db_password='...' TF_VAR_jwt_secret='...'              # nunca en archivos
terraform fmt -check -recursive
terraform init
terraform validate
terraform plan -var-file=environments/staging.tfvars
```

En CI (`terraform` job) se ejecutan `fmt -check`, `validate` y `plan`. Si no existe el secreto
`GCP_ACCESS_TOKEN`, el plan se ejecuta en modo *offline* (`-refresh=false`) para validar la
configuración completa sin credenciales. El `apply` es manual hasta contar con un proyecto GCP
con facturación.
