locals {
  prefix   = "cotiza-${var.environment}"
  registry = "${var.region}-docker.pkg.dev/${var.project_id}/${module.registry.repository_id}"
}

# APIs necesarias
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

module "registry" {
  source        = "./modules/registry"
  region        = var.region
  repository_id = local.prefix
  depends_on    = [google_project_service.apis]
}

module "database" {
  source      = "./modules/cloudsql"
  region      = var.region
  name        = "${local.prefix}-db"
  tier        = var.db_tier
  db_password = var.db_password
  depends_on  = [google_project_service.apis]
}

# ---------- Secretos (Secret Manager) ----------
resource "google_secret_manager_secret" "jwt" {
  secret_id = "${local.prefix}-jwt-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "jwt" {
  secret      = google_secret_manager_secret.jwt.id
  secret_data = var.jwt_secret
}

resource "google_secret_manager_secret" "database_url" {
  secret_id = "${local.prefix}-database-url"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${module.database.user}:${urlencode(var.db_password)}@localhost/${module.database.database}?host=/cloudsql/${module.database.connection_name}"
}

# ---------- Servicios Cloud Run ----------
module "python_service" {
  source       = "./modules/cloudrun"
  region       = var.region
  service_name = "${local.prefix}-nlp"
  project_id   = var.project_id
  memory       = "1Gi"
  image        = "${local.registry}/python-service:${var.image_tag}"
  port         = 8000
  # Solo accesible por el backend (sin acceso público)
  public = false
  # IAM autentica al llamador; no requiere un conector VPC para tráfico entre servicios.
  ingress         = "INGRESS_TRAFFIC_ALL"
  invoker_members = { backend = "serviceAccount:${module.backend.service_account_email}" }
  depends_on      = [google_project_service.apis]
}

module "backend" {
  source       = "./modules/cloudrun"
  region       = var.region
  service_name = "${local.prefix}-api"
  project_id   = var.project_id
  image        = "${local.registry}/backend-nestjs:${var.image_tag}"
  port         = 3000
  public       = true
  env_vars = {
    NODE_ENV             = "production"
    PYTHON_SERVICE_URL   = module.python_service.url
    PYTHON_AUTH_AUDIENCE = module.python_service.url
    APP_REVISION         = var.image_tag
    SEED_DEMO_DATA       = var.environment == "staging" ? "true" : "false"
  }
  secret_env_vars = {
    JWT_SECRET   = google_secret_manager_secret.jwt.secret_id
    DATABASE_URL = google_secret_manager_secret.database_url.secret_id
  }
  cloudsql_instances = [module.database.connection_name]
  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.jwt,
    google_secret_manager_secret_version.database_url,
  ]
}

module "frontend" {
  source       = "./modules/cloudrun"
  region       = var.region
  service_name = "${local.prefix}-web"
  project_id   = var.project_id
  image        = "${local.registry}/frontend:${var.image_tag}"
  port         = 8080
  public       = true
  env_vars     = { BACKEND_ORIGIN = module.backend.url }
  depends_on   = [google_project_service.apis]
}
