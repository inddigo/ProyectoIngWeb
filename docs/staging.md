# Staging EP2 gratuito: Render + Neon

## Estado

Preparado y validado sin crear recursos. Falta conectar cuentas, desplegar y comprobar una URL pública con Openverse real. Google Cloud queda descartado: los archivos de la raíz `terraform/` y scripts `bootstrap-staging.sh` / `deploy-staging.sh` son históricos y no se ejecutan en el pipeline actual. La configuración activa es `terraform/render`.

## Arquitectura y límites

Tres contenedores Render Free: Angular/nginx (8080), NestJS (3000) y FastAPI (8000). PostgreSQL reside en Neon Free con TLS. nginx mantiene el mismo origen; NestJS autentica sus llamadas a Python con `X-Service-Token`. Python permite `/health` sin secreto.

Render suspende servicios tras 15 minutos sin tráfico; despertar cada uno tarda alrededor de un minuto. Las **750 horas mensuales se comparten entre los tres servicios**: sirven para uso académico intermitente, no para tres instancias activas todo el mes. También hay cuotas de transferencia y compilación. No activar monitores para mantenerlos despiertos ni planes de pago. Neon Free tiene cuotas propias y no requiere tarjeta. No usar PostgreSQL Free de Render: expira a los 30 días.

## Preparación inicial

1. Crear o conectar cuentas Free en [Render](https://dashboard.render.com/) y [Neon](https://console.neon.tech/). El titular completa acceso y condiciones; no enviar claves por el chat.
2. Crear un proyecto PostgreSQL Neon en una región próxima a Virginia. Guardar la URL **directa** con `sslmode=require` en la variable privada de entorno `TF_VAR_database_url`. La conexión directa permite migraciones y sirve para la única instancia del backend.
3. Conectar Render al repositorio, obtener una API key y el owner ID; configurar `RENDER_API_KEY` y `RENDER_OWNER_ID` en el entorno local privado.
4. Generar secretos aleatorios distintos: `TF_VAR_jwt_secret` y `TF_VAR_python_service_token` (32 caracteres o más), `TF_VAR_seed_baker_password` (16 o más). No escribirlos en archivos versionados, chat ni historial. La última será la contraseña de ambas cuentas demo.
5. Desde **terraform/render**, ejecutar `terraform init`, `terraform plan -out=staging.tfplan`; revisar tres servicios `free` y aplicar `terraform apply staging.tfplan`. `main` debe contener EP2; para una prueba previa usar `TF_VAR_branch=ep2-integracion-web`.
6. Conservar el estado Terraform privado con copia segura: contiene secretos y está excluido de Git. Usar siempre ese estado para actualizar los recursos. No crear también estos servicios manualmente o mediante Blueprint.
7. Copiar las salidas de `terraform output` a las Variables del ambiente GitHub `staging`: `RENDER_NLP_SERVICE_ID`, `RENDER_API_SERVICE_ID`, `RENDER_WEB_SERVICE_ID`, `NLP_URL`, `API_URL`, `STAGING_URL`. Guardar como Secrets `RENDER_API_KEY` y `SEED_BAKER_PASSWORD` (igual al seed). La cuenta profesional es `pastelero@pasteleria.com`.

## Automatización y evidencia

Al integrar en main, publicar un tag v* o ejecutar el workflow sobre main, deben aprobar pruebas, seguridad, Terraform y escaneo/integración Docker. El script `scripts/deploy-render.py` comprueba planes Free y solicita desplegar el SHA aprobado, en orden Python/API/frontend; espera `live` y verifica el commit reportado por Render.

Render reconstruye las imágenes desde ese commit: las imágenes escaneadas en CI no son los mismos binarios de Render y sus bases podrían variar. La prueba externa posterior es obligatoria. El script despierta los servicios; el smoke test exige salud, SHA correcto, Openverse real sin fixture ni respaldo, persistencia, consulta y cotización. Si falla, el job falla. Se guardan los estados y JSON en `ep2-staging-evidence`, y la URL verificada en el resumen del workflow.

Terraform crea inicialmente la infraestructura; el pipeline actualiza las aplicaciones. No realiza merge ni release. La configuración ausente produce un fallo explícito, no un despliegue aprobado.

## Validación sin cuenta

Desde terraform/render, usar valores ficticios solo para el plan: `RENDER_API_KEY=offline-plan`, `RENDER_OWNER_ID=usr-offlineplan`, `TF_VAR_database_url=postgresql://offline:offline@example.invalid/db?sslmode=require` y secretos ficticios que cumplan sus longitudes. Ejecutar `terraform fmt -check`, `terraform init -backend=false`, `terraform validate`, `terraform plan -refresh=false -lock=false`. Resultado: tres creaciones, cero modificaciones/destrucciones. **Nunca aplicar el plan ficticio.**

## Demostración

Abrir primero las tres URLs para despertarlas; después el frontend. Swagger NestJS: `STAGING_URL/api/docs`. Comprobar `/health` y ejecutar el smoke test con `REQUIRE_REAL_WEB=1`, `EXPECTED_REVISION` y `SEED_BAKER_PASSWORD` desde variables privadas del entorno. Usar datos ficticios, revisar consumo y probar antes de presentar. No dar staging por acreditado hasta obtener la evidencia real.

Fuentes: [límites Render Free](https://render.com/docs/free), [Neon Free](https://neon.com/pricing), [Terraform Render](https://render.com/docs/terraform-provider), [despliegue por commit](https://api-docs.render.com/reference/create-deploy).
