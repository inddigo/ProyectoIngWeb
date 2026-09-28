output "frontend_url" {
  description = "URL pública del frontend (web/PWA)"
  value       = module.frontend.url
}

output "backend_url" {
  description = "URL pública de la API NestJS"
  value       = module.backend.url
}

output "python_service_url" {
  description = "URL interna del servicio NLP"
  value       = module.python_service.url
}

output "artifact_registry" {
  description = "Repositorio donde el pipeline publica las imágenes"
  value       = local.registry
}

output "database_connection_name" {
  description = "Nombre de conexión de Cloud SQL"
  value       = module.database.connection_name
}
