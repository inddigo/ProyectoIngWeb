resource "google_sql_database_instance" "postgres" {
  name             = var.name
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = var.tier

    ip_configuration {
      # Acceso vía Cloud SQL Auth Proxy integrado de Cloud Run (sin IP autorizadas)
      ipv4_enabled = true
    }

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = false # staging: permite recrear el ambiente
}

resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app" {
  name     = var.user_name
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}
