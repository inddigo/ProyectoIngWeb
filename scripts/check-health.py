"""Chequeo puntual de salud y alertas. No mantiene despiertos los servicios Free."""

import argparse
import json
import urllib.parse
from pathlib import Path

import httpx


def inspect(base):
    parsed = urllib.parse.urlsplit(base)
    local = parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
    if not local and not (parsed.scheme == "https" and parsed.hostname == "cotiza-ep2-web.onrender.com"):
        raise ValueError("Usa el staging conocido o un stack local")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("La URL no debe incluir credenciales, consulta ni fragmento")
    with httpx.Client(timeout=90, follow_redirects=False) as client:
        health = client.get(base.rstrip("/") + "/health")
        health.raise_for_status()
        data = health.json()
        metrics = client.get(base.rstrip("/") + "/health/metrics")
        metrics.raise_for_status()
        stats = metrics.json()
        retrieval = client.get(base.rstrip("/") + "/api/v1/orders/nlp-metrics")
        retrieval.raise_for_status()
        web = retrieval.json().get("web_retrieval", {})
    alerts = list(stats.get("alerts", []))
    alerts.extend(name + "_down" for name, status in data["services"].items() if status != "up")
    source_status = web.get("source_status", "unknown")
    if source_status == "degraded":
        alerts.append("web_source_degraded")
    return {
        "revision": data.get("revision"),
        "services": data["services"],
        "metrics": stats,
        "webSource": {"status": source_status, "lastSuccessAt": web.get("last_success_at")},
        "alerts": alerts,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("base")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        result = inspect(args.base)
    except (ValueError, KeyError, httpx.HTTPError):
        raise SystemExit("ALERTA: no fue posible validar la salud; revisar conectividad y logs") from None
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"alerts": result["alerts"], "revision": result["revision"]}))
    raise SystemExit(1 if result["alerts"] else 0)
