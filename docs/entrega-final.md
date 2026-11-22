# Cotiza — preparación de la Entrega Final

## Estado de esta versión

Candidata a Entrega Final sobre EP2 (`e6c7be1`, 22-11-2026 UTC). CI remoto aprobado en [ejecución 44970123627](https://github.com/inddigo/ProyectoIngWeb/actions/runs/44970123627). Los tres servicios Render se reconstruyeron y quedaron `live` en ese SHA. El job automático de staging fue omitido por tratarse de una rama de PR; esta publicación se hizo manualmente desde Render. La release final aún no está publicada: antes de etiquetar, renovar el secreto `RENDER_API_KEY` vencido en GitHub Actions y volver a comprobar el flujo externo con Openverse real.

La pauta de evaluación usada por el equipo se describe como Entrega Final (EF): arquitectura integrada, multiplataforma, procesamiento web, adaptación verificable, pruebas, DevSecOps, privacidad, observabilidad y defensa individual. Antes de presentar, cotejar esta lista con el PDF de la pauta.

## Funciones incorporadas

- Perfil propio de costos: valor hora, costos fijos y recargo, aplicable por horas a cada cotización.
- Recomendación explicable para encargos generales, pastelería y tatuajes. Compara contra una base sin historial y utiliza cotizaciones aceptadas comparables del profesional cuando lo autoriza.
- Registro de autor de cotización y persistencia de cada recomendación, su versión, entradas y resultado.
- Validación anidada de insumos, cantidades, unidades y límites. Los totales se recalculan en el servidor; no se confían los totales del navegador.
- La recomendación se invalida en la interfaz cuando cambian los costos. La API también rechaza vincularla a otro pedido, profesional o costeo.
- Retiro del historial, actualización del nombre, descarga de datos propios y eliminación de cuenta con contraseña actual.
- Métricas HTTP y alertas básicas por instancia. Aviso de nueva versión PWA y mensaje de conectividad que no promete envíos automáticos.

Reglas, privacidad y limitaciones: [ADR-007](ADR/007-recomendaciones-explicables-y-privacidad.md).

## Ejecutar localmente

Con Docker Desktop activo, desde la raíz del repositorio:

```bash
docker compose -p cotiza-final-local -f docker-compose.yml -f docker-compose.final-local.yml up -d --build --wait
```

Abrir `http://localhost:18080`. API directa: `http://localhost:13000`; FastAPI: `http://localhost:18000`. Los puertos solo escuchan en este equipo. Este proyecto Compose tiene su propia base de datos y nombres de imagen; no comparte la base de EP2 ni utiliza Neon.

Las cuentas de demostración y sus claves locales están en `demo-credentials.local.txt`, excluido del repositorio. No usar esas cuentas en servicios remotos.

Abrir el perfil profesional, definir valores y guardar. Crear un encargo desde el portal y confirmarlo como cliente; cotizar desde el panel profesional. Para activar historial hacen falta tres trabajos aceptados comparables emitidos por ese profesional con desglose de costos. La prueba integrada prepara sus propios casos y después retira sus cuentas.

En la base local de revisión quedaron tres trabajos aceptados y un encargo pendiente con prefijo `[DEMO LOCAL]`, pertenecientes a las cuentas de desarrollo. Son datos ficticios preparados para mostrar la adaptación. El perfil de esa cuenta demo está configurado con valor hora $6.000, fijos $2.000, recargo 30% y uso de historial; las cuentas nuevas conservan el historial desactivado por defecto.

## Verificaciones reproducibles

```bash
cd backend-nestjs
npm ci
npx prisma generate
npm run lint
npm run format:check
npm test -- --runInBand
npm run build
node ../scripts/evaluate-final.cjs ../docs/evidence/final-local/adaptation.json
cd ../frontend
npm ci
npm run lint
npm run test:ci
npm run build
cd ..
python -m pip install httpx==0.28.1
python scripts/final-check.py
python scripts/check-health.py http://localhost:18080 --output docs/evidence/final-local/health.json
```

`scripts/final-check.py` solo admite localhost. Comprueba permisos, el cambio por historial, el modo base, la persistencia y privacidad con cuentas sintéticas de la ejecución. No admite Render.

En PowerShell, `./scripts/verify-rollback.ps1` construye el backend desde el código estable de EP2, lo ejecuta temporalmente sobre el esquema ampliado del stack local y restaura la misma imagen final que estaba en uso. No modifica el repositorio ni el staging. No demuestra recuperación ante migraciones destructivas.

La evaluación sintética del motor contiene ocho escenarios: error absoluto medio frente a sus precios objetivo de $7.537,50 CLP en la base y $5.430 CLP con las reglas adaptativas. Los objetivos fueron fijados para esos escenarios; **no son precios de mercado ni resultados con usuarios**. Evidencia: `docs/evidence/final-local/adaptation.json`.

Prueba integrada local: 45 comprobaciones correctas. Evidencia: `docs/evidence/final-local/integration.json`. Rollback: `docs/evidence/final-local/rollback.json`. Los resultados de tests unitarios se mantienen separados de estas comprobaciones HTTP.

Verificación local al 21 de octubre: 81 pruebas Jest, 26 pruebas Angular, 38 pruebas Python y siete pruebas de scripts (cuatro del despliegue simulado y tres del análisis de usuarios): **152 pruebas aprobadas**. La CI remota del commit `e6c7be1` terminó aprobada: lint, pruebas y auditorías de dependencias, build web y APK Android, Semgrep, Gitleaks, Terraform y build/escaneo/integración Docker. El job automático de staging fue omitido por la rama de PR. Render confirmó los tres servicios reconstruidos y `live` sobre ese SHA.

Semgrep ejecutó 655 reglas sobre 221 archivos sin hallazgos y Gitleaks no detectó secretos en la copia del árbol local analizado. `npm audit --omit=dev` no reportó vulnerabilidades en ambos componentes. Trivy aprobó las tres imágenes locales sin hallazgos HIGH/CRITICAL corregibles, con el mismo criterio `--ignore-unfixed` del pipeline. Los informes están en `docs/evidence/final-local/trivy-*.json`. Estos controles no garantizan la ausencia de otros riesgos.

## Observabilidad y degradación

`GET /health` conserva el estado de NestJS, PostgreSQL y Python. `GET /health/metrics` informa contadores desde el arranque y una ventana de hasta 256 solicitudes de los últimos 60 segundos, sin cuerpos, rutas ni identidades. Excluye las consultas a `/health`.

Con al menos cinco observaciones se señala una tasa de errores 5xx igual o superior al 20% o p95 superior a cinco segundos. Son alertas de diagnóstico en la respuesta, no notificaciones a terceros ni un servicio de monitoreo permanente. Los contadores se reinician al reiniciar el proceso y no agregan varias réplicas.

`scripts/check-health.py` consulta estado, métricas y la última condición observada de Openverse; devuelve código 1 ante alerta. No realiza consultas periódicas para mantener despiertos los servicios Free. La ausencia de observaciones no prueba disponibilidad de la fuente.

Durante la verificación local Openverse presentó `ReadTimeout`; el procesamiento siguió con cero referencias y `fallback_used: true`. La fuente sintética del CI permite comprobar limpieza, persistencia y consulta de manera determinista. Esa evidencia no acredita recuperación real de Internet. Antes de una defensa debe comprobarse nuevamente Openverse real.

`python scripts/verify-local-degradation.py` demostró también la caída completa del contenedor Python: `/health` indicó indisponibilidad, NestJS devolvió los cinco campos generales para completar manualmente, confianza cero y ninguna referencia inventada. El script restauró el servicio y comprobó salud. Solo opera sobre `cotiza-final-local`; informe: `docs/evidence/final-local/degradation.json`.

## Android y PWA

La aplicación mantiene Ionic/Angular/Capacitor y una única base de frontend. El workflow incorpora compilación de APK debug, lint nativo y artefacto descargable, además de la sincronización de Capacitor. Se añadió `PortalSmokeTest` para comprobar el arranque del portal general en WebView HTTPS.

En un equipo con Java 21, Android SDK 36 y un dispositivo o emulador disponible:

```bash
cd frontend
npm run cap:sync
cd android
./gradlew assembleDebug lintDebug testDebugUnitTest
./gradlew connectedDebugAndroidTest
```

La CI compiló el APK debug y ejecutó lint nativo. **Pendiente de ejecución:** prueba instrumentada en dispositivo/emulador, revisión manual de accesibilidad y comportamiento en Android real. La compilación del APK no sustituye esas verificaciones.

Para PWA, comprobar instalación, navegación, pérdida y recuperación de conexión y actualización. Solo se cachean recursos de la aplicación; no hay cola de envíos sin conexión. El aviso de actualización pide guardar el trabajo antes de recargar.

## Cierre académico pendiente

1. Ejecutar la evaluación exploratoria con personas y registrar observaciones reales: [protocolo y plantilla](evaluation/protocolo-usuarios.md). El agregado actual marca explícitamente cero participantes.
2. Ejecutar y registrar APK, prueba instrumentada y flujos en Android; completar revisión manual de teclado, lector de pantalla, contraste y pantallas pequeñas.
3. Actualizar el prototipo Figma y el tablero con esta ampliación. Sus enlaces siguen en README; no se modificaron externamente durante el trabajo local.
4. Revisar y explicar la implementación entre integrantes; registrar contribuciones reales y preparar la defensa individual.
5. Antes de generar la release final: cotejar con la pauta PDF, renovar en GitHub Actions el secreto `RENDER_API_KEY` (la credencial configurada venció el 27-10-2026), ejecutar el workflow de staging sobre el SHA evaluado y comprobar Openverse real con el smoke test. El despliegue manual actual está activo, pero no reemplaza ese smoke test de publicación.

El borrador de presentación está en [presentacion-final.md](presentacion-final.md). No se añadieron pagos, chat, audio, facturación ni competencia entre profesionales: permanecen fuera del alcance acordado.

## Seguridad conocida

Los controles existentes de roles, propiedad, JWT, límites, cabeceras, TLS y escáneres se mantienen. Las nuevas rutas usan la identidad del token y no aceptan un usuario objetivo en el cuerpo. La baja exige comprobar la contraseña y los borradores en memoria se limpian al cerrar sesión.

Persiste la alerta documentada de `braces` en herramientas de desarrollo del frontend, sin parche en la versión disponible al cierre de EP2. No está en la imagen servida por nginx; evitar patrones de archivos externos y no exponer el servidor de desarrollo. No se garantiza ausencia absoluta de vulnerabilidades. Ver [ADR-004](ADR/004-seguridad-roles-y-degradacion.md).
