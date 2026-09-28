variable "name" {
  type = string
}

variable "region" {
  type = string
}

variable "tier" {
  type = string
}

variable "database_name" {
  type    = string
  default = "pastry_db"
}

variable "user_name" {
  type    = string
  default = "pastry_user"
}

variable "db_password" {
  type      = string
  sensitive = true
}
