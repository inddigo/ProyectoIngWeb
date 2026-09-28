terraform {
  required_version = ">= 1.8.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Estado remoto para staging (descomentar al tener el bucket creado):
  # backend "gcs" {
  #   bucket = "cotiza-tfstate-staging"
  #   prefix = "staging"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
