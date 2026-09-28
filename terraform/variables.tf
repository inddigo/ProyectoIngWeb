variable "project_id" {
  type        = string
  description = "ID del proyecto de Google Cloud"
}

variable "region" {
  type        = string
  description = "Región de despliegue"
  default     = "us-central1"
}

variable "environment" {
  type        = string
  description = "Nombre del ambiente (staging, production)"
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment debe ser staging o production."
  }
}

variable "image_tag" {
  type        = string
  description = "Tag de las imágenes Docker a desplegar (ej. SHA del commit)"
  default     = "latest"
}

variable "db_tier" {
  type        = string
  description = "Tamaño de la instancia Cloud SQL"
  default     = "db-f1-micro"
}

variable "db_password" {
  type        = string
  description = "Contraseña del usuario de PostgreSQL (se inyecta vía TF_VAR_db_password)"
  sensitive   = true
}

variable "jwt_secret" {
  type        = string
  description = "Secreto para firmar JWT (se inyecta vía TF_VAR_jwt_secret)"
  sensitive   = true
}
