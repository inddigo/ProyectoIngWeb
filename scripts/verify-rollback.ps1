param([string]$StableRevision = '5df8b25a0fd0c9826a309e4cd93bde6d3a012ab9')
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ($StableRevision -notmatch '^[0-9a-f]{40}$') { throw 'Se requiere un SHA completo' }
Set-Location -LiteralPath $repoRoot

function Invoke-DockerChecked([string[]]$Arguments) {
    & docker @Arguments
    if ($LASTEXITCODE -ne 0) { throw 'Docker no pudo completar la operación local' }
}

$container = 'cotiza-final-local-backend-1'
$project = & docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' $container
if ($LASTEXITCODE -ne 0 -or $project -ne 'cotiza-final-local') { throw 'Solo se permite el stack aislado cotiza-final-local' }
$finalImage = & docker inspect --format '{{.Image}}' $container
$before = Invoke-RestMethod -Uri 'http://127.0.0.1:18080/health' -TimeoutSec 90
if ($before.revision -ne 'final-local') { throw 'El stack no está ejecutando la versión final local' }

$work = Join-Path $repoRoot ('.local-tools/rollback-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $work -Force | Out-Null
$archive = Join-Path $work 'source.tar'
& git archive --format=tar --output=$archive $StableRevision backend-nestjs
if ($LASTEXITCODE -ne 0) { throw 'No se pudo exportar la versión estable' }
& tar -xf $archive -C $work
if ($LASTEXITCODE -ne 0) { throw 'No se pudo extraer la versión estable' }
Invoke-DockerChecked -Arguments @('build', '-t', 'cotiza-final-api:rollback-ep2', (Join-Path $work 'backend-nestjs'))
$rollbackConfig = Join-Path $work 'compose.rollback.yml'
@'
services:
  backend:
    image: cotiza-final-api:rollback-ep2
    environment:
      APP_REVISION: rollback-ep2-local
'@ | Set-Content -LiteralPath $rollbackConfig -Encoding utf8
$compose = @('compose', '-p', 'cotiza-final-local', '-f', 'docker-compose.yml', '-f', 'docker-compose.final-local.yml')
$rollback = $null
$restored = $null
try {
    Invoke-DockerChecked ($compose + @('-f', $rollbackConfig, 'up', '-d', '--no-deps', '--no-build', '--wait', 'backend'))
    Invoke-DockerChecked ($compose + @('restart', 'frontend'))
    $rollback = Invoke-RestMethod -Uri 'http://127.0.0.1:18080/health' -TimeoutSec 90
    if ($rollback.revision -ne 'rollback-ep2-local' -or $rollback.services.database -ne 'up') { throw 'Falló la salud de la versión estable sobre el esquema ampliado' }
} finally {
    Invoke-DockerChecked ($compose + @('up', '-d', '--no-deps', '--no-build', '--wait', 'backend'))
    Invoke-DockerChecked ($compose + @('restart', 'frontend'))
    $restored = Invoke-RestMethod -Uri 'http://127.0.0.1:18080/health' -TimeoutSec 90
    if ($restored.revision -ne 'final-local') { throw 'La versión final local no se restauró correctamente' }
}
$afterImage = & docker inspect --format '{{.Image}}' $container
if ($afterImage -ne $finalImage) { throw 'La imagen restaurada no coincide con la inicial' }
$out = Join-Path $repoRoot 'docs/evidence/final-local/rollback.json'
New-Item -ItemType Directory -Path (Split-Path $out -Parent) -Force | Out-Null
[ordered]@{ environment = 'local-only'; stableSourceRevision = $StableRevision; rolledBack = ($null -ne $rollback); rollbackServices = $rollback.services; restoredServices = $restored.services; finalImageRestored = ($afterImage -eq $finalImage); testedAt = [DateTime]::UtcNow.ToString('o'); limitation = 'Demuestra compatibilidad y recuperación en Docker local. No se ejecutó contra Render ni se prueba una migración destructiva.' } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $out -Encoding utf8
Write-Output 'Rollback local verificado y versión final restaurada.'
