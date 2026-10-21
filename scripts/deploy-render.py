"""Despliega el SHA aprobado en Render; no crea servicios ni cambia planes."""
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.render.com/v1"


def request_json(url, token=None, payload=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode()
    request = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(request, timeout=90) as response:
        return json.load(response)


def main():
    required = ["RENDER_API_KEY", "RENDER_NLP_SERVICE_ID", "RENDER_API_SERVICE_ID", "RENDER_WEB_SERVICE_ID", "STAGING_URL", "NLP_URL", "API_URL", "APP_REVISION"]
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise RuntimeError("Falta configurar: " + ", ".join(missing))
    revision = os.environ["APP_REVISION"]
    if not re.fullmatch(r"[0-9a-f]{40}", revision):
        raise RuntimeError("APP_REVISION debe ser un SHA completo")
    token = os.environ["RENDER_API_KEY"]
    evidence = Path(os.environ.get("EVIDENCE_DIR", "ep2-staging-evidence"))
    evidence.mkdir(parents=True, exist_ok=True)
    for label in ("NLP", "API", "WEB"):
        service = os.environ[f"RENDER_{label}_SERVICE_ID"]
        if not re.fullmatch(r"srv-[a-z0-9]+", service):
            raise RuntimeError("Identificador de servicio Render inválido")
        info = request_json(f"{API}/services/{service}", token)
        if info.get("serviceDetails", {}).get("plan") != "free":
            raise RuntimeError("El servicio no tiene plan Free; revisar antes de desplegar")
        deployed = request_json(f"{API}/services/{service}/deploys", token, {"commitId": revision})
        deployment_id = deployed["id"]
        deadline = time.monotonic() + 1800
        while time.monotonic() < deadline:
            current = request_json(f"{API}/services/{service}/deploys/{deployment_id}", token)
            status = current["status"]
            if status == "live":
                if current.get("commit", {}).get("id") != revision:
                    raise RuntimeError("El commit publicado no coincide con el aprobado")
                (evidence / f"render-{label.lower()}.json").write_text(json.dumps({"service": service, "deployId": deployment_id, "status": status, "revision": revision}), encoding="utf-8")
                print(f"{label}: SHA aprobado publicado")
                break
            if status in ("build_failed", "update_failed", "canceled", "deactivated", "pre_deploy_failed"):
                raise RuntimeError(f"Despliegue {label} falló: {status}")
            time.sleep(15)
        else:
            raise RuntimeError(f"Tiempo de despliegue agotado: {label}")
    # Despertar cada servicio antes de la prueba funcional (Free se suspende).
    for key in ("NLP_URL", "API_URL", "STAGING_URL"):
        url = os.environ[key].rstrip("/")
        if not re.fullmatch(r"https://[a-z0-9-]+\.onrender\.com", url):
            raise RuntimeError(f"{key} debe ser la URL HTTPS asignada por Render")
        for attempt in range(20):
            try:
                health = request_json(url + "/health")
                if health.get("status") == "ok":
                    break
            except (urllib.error.URLError, ValueError, TimeoutError):
                pass
            time.sleep(10)
        else:
            raise RuntimeError(f"No se pudo comprobar la salud de {key}")
    print("Servicios despiertos; ejecutar la prueba funcional con fuente real.")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Render/health respondió HTTP {error.code}; revisar el panel del proveedor") from None
    except (RuntimeError, urllib.error.URLError, TimeoutError) as error:
        # Evitar imprimir cuerpos HTTP o cabeceras que puedan contener secretos.
        raise SystemExit(str(error) if isinstance(error, RuntimeError) else "Fallo de conexión al proveedor") from None
