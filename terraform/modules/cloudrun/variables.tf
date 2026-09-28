variable "service_name" {
  type = string
}

variable "region" {
  type = string
}

variable "image" {
  type = string
}

variable "port" {
  type = number
}

variable "public" {
  type        = bool
  description = "Si es true, cualquier usuario puede invocar el servicio"
  default     = false
}

variable "ingress" {
  type    = string
  default = "INGRESS_TRAFFIC_ALL"
}

variable "invoker_members" {
  type        = map(string)
  description = "Nombre lógico (clave estática) -> miembro IAM con rol run.invoker"
  default     = {}
}

variable "env_vars" {
  type    = map(string)
  default = {}
}

variable "secret_env_vars" {
  type        = map(string)
  description = "Variable de entorno -> ID del secreto en Secret Manager"
  default     = {}
}

variable "cloudsql_instances" {
  type    = list(string)
  default = []
}

variable "max_instances" {
  type    = number
  default = 2
}
