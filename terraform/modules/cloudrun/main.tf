# Cuenta de servicio dedicada por servicio (mínimo privilegio)
resource "google_service_account" "service" {
  account_id   = substr(replace(var.service_name, "_", "-"), 0, 30)
  display_name = "Cloud Run ${var.service_name}"
}

resource "google_cloud_run_v2_service" "service" {
  name     = var.service_name
  location = var.region
  ingress  = var.ingress
  depends_on = [
    google_secret_manager_secret_iam_member.service_secrets,
    google_project_iam_member.cloudsql,
  ]

  template {
    service_account = google_service_account.service.email

    scaling {
      min_instance_count = 0
      max_instance_count = var.max_instances
    }

    dynamic "volumes" {
      for_each = length(var.cloudsql_instances) > 0 ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = var.cloudsql_instances
        }
      }
    }

    containers {
      image = var.image
      resources {
        limits = { cpu = "1", memory = var.memory }
      }
      startup_probe {
        initial_delay_seconds = 0
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 24
        tcp_socket { port = var.port }
      }

      ports {
        container_port = var.port
      }

      dynamic "env" {
        for_each = var.env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value
              version = "latest"
            }
          }
        }
      }

      dynamic "volume_mounts" {
        for_each = length(var.cloudsql_instances) > 0 ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }
    }
  }
}

resource "google_secret_manager_secret_iam_member" "service_secrets" {
  for_each  = var.secret_env_vars
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.service.email}"
}

resource "google_project_iam_member" "cloudsql" {
  count   = length(var.cloudsql_instances) > 0 ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.service.email}"
}

resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.public ? 1 : 0
  name     = google_cloud_run_v2_service.service.name
  location = google_cloud_run_v2_service.service.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_cloud_run_v2_service_iam_member" "invokers" {
  for_each = var.invoker_members
  name     = google_cloud_run_v2_service.service.name
  location = google_cloud_run_v2_service.service.location
  role     = "roles/run.invoker"
  member   = each.value
}
