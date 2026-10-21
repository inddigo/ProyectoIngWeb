output "staging_url" { value = render_web_service.web.url }
output "api_url" { value = render_web_service.api.url }
output "nlp_url" { value = render_web_service.nlp.url }
output "nlp_service_id" { value = render_web_service.nlp.id }
output "api_service_id" { value = render_web_service.api.id }
output "web_service_id" { value = render_web_service.web.id }
