output "connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "database" {
  value = google_sql_database.database.name
}

output "user" {
  value = google_sql_user.app.name
}
