variable "repo_url" {
  type    = string
  default = "https://github.com/inddigo/ProyectoIngWeb"
}
variable "branch" {
  type    = string
  default = "main"
}
variable "name_prefix" {
  type    = string
  default = "cotiza-ep2"
}
variable "database_url" {
  type      = string
  sensitive = true
  validation {
    condition     = startswith(var.database_url, "postgresql://") && strcontains(var.database_url, "sslmode=require")
    error_message = "Usar la URL PostgreSQL de Neon con sslmode=require."
  }
}
variable "jwt_secret" {
  type      = string
  sensitive = true
  validation {
    condition     = length(var.jwt_secret) >= 32
    error_message = "JWT_SECRET debe tener al menos 32 caracteres."
  }
}
variable "python_service_token" {
  type      = string
  sensitive = true
  validation {
    condition     = length(var.python_service_token) >= 32
    error_message = "El secreto entre servicios debe tener al menos 32 caracteres."
  }
}
variable "seed_baker_password" {
  type      = string
  sensitive = true
  validation {
    condition     = length(var.seed_baker_password) >= 16
    error_message = "Usar una contraseña exclusiva de staging de al menos 16 caracteres."
  }
}
