variable "project_id" {}
variable "region" {}
variable "db_password" {
  sensitive = true
}

resource "google_sql_database_instance" "postgres" {
  name             = "pastry-db-staging"
  database_version = "POSTGRES_16"
  region           = var.region
  project          = var.project_id

  settings {
    tier = "db-f1-micro" # Free tier for staging

    ip_configuration {
      ipv4_enabled = true
    }
  }
}

resource "google_sql_database" "database" {
  name     = "pastry_db"
  instance = google_sql_database_instance.postgres.name
  project  = var.project_id
}

resource "google_sql_user" "users" {
  name     = "pastry_user"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
  project  = var.project_id
}

output "connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}
