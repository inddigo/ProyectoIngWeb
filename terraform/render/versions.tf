terraform {
  required_version = ">= 1.8.0"
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "= 1.9.1"
    }
  }
}
provider "render" {
  wait_for_deploy_completion = false
}
