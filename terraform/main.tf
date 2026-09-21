terraform {
  required_version = ">= 1.8.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

variable "gcp_project_id" {
  type        = string
  description = "ID del proyecto en Google Cloud Platform"
  default     = "pastry-adaptative-staging"
}

variable "gcp_region" {
  type        = string
  description = "Región de despliegue GCP"
  default     = "us-central1"
}

variable "db_password" {
  type        = string
  description = "Password para la base de datos PostgreSQL"
  sensitive   = true
}

module "database" {
  source      = "./modules/cloudsql"
  project_id  = var.gcp_project_id
  region      = var.gcp_region
  db_password = var.db_password
}

module "python_service" {
  source       = "./modules/cloudrun"
  project_id   = var.gcp_project_id
  region       = var.gcp_region
  service_name = "pastry-python-service"
  image_url    = "gcr.io/${var.gcp_project_id}/python-service:latest"
}

module "nestjs_backend" {
  source       = "./modules/cloudrun"
  project_id   = var.gcp_project_id
  region       = var.gcp_region
  service_name = "pastry-backend"
  image_url    = "gcr.io/${var.gcp_project_id}/nestjs-backend:latest"
  env_vars = {
    PYTHON_SERVICE_URL = module.python_service.url
    DATABASE_URL       = "postgresql://pastry_user:${var.db_password}@${module.database.connection_name}/pastry_db"
  }
}

output "python_service_url" {
  value = module.python_service.url
}

output "nestjs_backend_url" {
  value = module.nestjs_backend.url
}
