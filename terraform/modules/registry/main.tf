resource "google_artifact_registry_repository" "docker" {
  location      = var.region
  repository_id = var.repository_id
  format        = "DOCKER"
  description   = "Imágenes Docker de la plataforma Cotiza"
}
