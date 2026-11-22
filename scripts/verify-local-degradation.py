"""Detiene exclusivamente el NLP del stack local, comprueba degradación y lo restaura."""

import json
import subprocess
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx


def main():
    name = "cotiza-final-local-python-service-1"
    project = subprocess.check_output(
        ["docker", "inspect", "--format", '{{index .Config.Labels "com.docker.compose.project"}}', name],
        text=True,
    ).strip()
    if project != "cotiza-final-local":
        raise RuntimeError("Solo se permite el contenedor NLP del stack aislado")
    degraded = None
    restored = False
    try:
        subprocess.run(["docker", "stop", name], check=True, stdout=subprocess.DEVNULL)
        with httpx.Client(base_url="http://127.0.0.1:18080", timeout=40) as client:
            health = client.get("/health")
            health.raise_for_status()
            if health.json()["services"]["pythonService"] != "down":
                raise AssertionError("La salud debe informar la indisponibilidad de Python")
            response = client.post(
                "/api/v1/orders/nlp-structure",
                json={"domain": "general", "rawText": "Encargo sintético durante la prueba de indisponibilidad"},
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("fallback") or data["entities"]["confidence_score"] != 0 or data["web_references"]:
                raise AssertionError(
                    "La respuesta debe permitir completar campos manualmente sin referencias inventadas"
                )
            degraded = {
                "fallback": data["fallback"],
                "confidence": 0,
                "references": 0,
                "editableFields": sorted(k for k in data["entities"] if k != "confidence_score"),
            }
    finally:
        subprocess.run(["docker", "start", name], check=True, stdout=subprocess.DEVNULL)
        for _ in range(30):
            try:
                health = httpx.get("http://127.0.0.1:18080/health", timeout=5)
                if health.is_success and health.json()["services"]["pythonService"] == "up":
                    restored = True
                    break
            except (ValueError, httpx.HTTPError):
                pass
            time.sleep(1)
        if not restored:
            raise RuntimeError("No se pudo verificar la restauración de Python local")
    report = {
        "environment": "local-only",
        "testedAt": datetime.now(UTC).isoformat(),
        "degraded": degraded,
        "restored": restored,
    }
    path = Path(__file__).resolve().parents[1] / "docs/evidence/final-local/degradation.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Degradación manual verificada; servicio Python local restaurado")


if __name__ == "__main__":
    main()
