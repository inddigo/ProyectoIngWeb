# Free explícito: ningún recurso solicita un plan de pago.
# Los servicios se conectan por sus URL HTTPS públicas, no por la red privada.
resource "render_web_service" "nlp" {
  name              = "${var.name_prefix}-nlp"
  plan              = "free"
  region            = "virginia"
  health_check_path = "/health"
  runtime_source = {
    docker = {
      repo_url            = var.repo_url
      branch              = var.branch
      context             = "./service-python"
      dockerfile_path     = "./service-python/Dockerfile"
      auto_deploy_trigger = "off"
    }
  }
  env_vars = {
    PORT                 = { value = "8000" }
    PYTHON_SERVICE_TOKEN = { value = var.python_service_token }
  }
}
resource "render_web_service" "api" {
  name              = "${var.name_prefix}-api"
  plan              = "free"
  region            = "virginia"
  health_check_path = "/health"
  runtime_source = {
    docker = {
      repo_url            = var.repo_url
      branch              = var.branch
      context             = "./backend-nestjs"
      dockerfile_path     = "./backend-nestjs/Dockerfile"
      auto_deploy_trigger = "off"
    }
  }
  env_vars = {
    PORT                 = { value = "3000" }
    NODE_ENV             = { value = "production" }
    DATABASE_URL         = { value = var.database_url }
    JWT_SECRET           = { value = var.jwt_secret }
    PYTHON_SERVICE_URL   = { value = render_web_service.nlp.url }
    PYTHON_SERVICE_TOKEN = { value = var.python_service_token }
    SEED_DEMO_DATA       = { value = "true" }
    SEED_BAKER_PASSWORD  = { value = var.seed_baker_password }
    SEED_CLIENT_PASSWORD = { value = var.seed_baker_password }
  }
}
resource "render_web_service" "web" {
  name              = "${var.name_prefix}-web"
  plan              = "free"
  region            = "virginia"
  health_check_path = "/index.html"
  runtime_source = {
    docker = {
      repo_url            = var.repo_url
      branch              = var.branch
      context             = "./frontend"
      dockerfile_path     = "./frontend/Dockerfile"
      auto_deploy_trigger = "off"
    }
  }
  env_vars = {
    PORT           = { value = "8080" }
    BACKEND_ORIGIN = { value = render_web_service.api.url }
  }
}
