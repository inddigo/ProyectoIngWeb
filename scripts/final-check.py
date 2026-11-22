"""Comprueba la adaptación y privacidad contra un stack local desechable.

Solo admite localhost. Crea sus propios clientes y usa un profesional de demo.
No utilizar contra Render, Neon ni cuentas reales.
"""

import argparse
import json
import os
import time
import urllib.parse
from pathlib import Path

import httpx


def run(base, output):
    url = urllib.parse.urlsplit(base)
    if url.scheme != "http" or url.hostname not in {"localhost", "127.0.0.1"} or url.username or url.password:
        raise SystemExit("Esta prueba solo admite un stack HTTP local aislado")
    checks = []

    def check(name, condition):
        if not condition:
            raise AssertionError(name)
        checks.append(name)

    with httpx.Client(base_url=base, timeout=90, follow_redirects=False) as client:

        def req(method, route, data=None, token=None, status=200):
            headers = {"X-Correlation-Id": "final-local-check"}
            if token:
                headers["Authorization"] = "Bearer " + token
            response = client.request(method, route, json=data, headers=headers)
            check(f"{method} {route.split('?')[0]} -> {status}", response.status_code == status)
            return response.json()

        health = req("GET", "/health")
        check("Base de datos local disponible", health["services"]["database"] == "up")
        baker = req(
            "POST",
            "/auth/login",
            {
                "email": os.getenv("SEED_BAKER_EMAIL", "pastelero@pasteleria.com"),
                "password": os.getenv("SEED_BAKER_PASSWORD", "pastelero123"),
            },
        )["access_token"]
        suffix = str(time.time_ns())
        password = "local-final-check-2026"
        token = req(
            "POST",
            "/auth/register",
            {"email": f"final-{suffix}@example.test", "password": password, "name": "Prueba sintética"},
            status=201,
        )["access_token"]
        other = req(
            "POST",
            "/auth/register",
            {"email": f"other-{suffix}@example.test", "password": password, "name": "Otro cliente sintético"},
            status=201,
        )["access_token"]
        profile_before = req("GET", "/api/v1/quotes/profile", token=baker)
        req("GET", "/api/v1/quotes/profile", token=token, status=403)
        req("GET", "/api/v1/quotes/profile", status=401)
        req(
            "PUT",
            "/api/v1/quotes/profile",
            {"hourlyRate": 6000, "fixedCosts": 2000, "profitMargin": 30, "useHistory": True},
            baker,
        )
        attrs = {
            "service_type": "Prueba " + suffix,
            "quantity": 2,
            "materials": "Madera",
            "deadline": "2026-12-20",
            "delivery": "A domicilio",
        }
        costs = {
            "items": [{"name": "Madera", "packageCost": 4000, "packageQuantity": 1, "quantityUsed": 1, "unit": "u"}],
            "laborCost": 6000,
            "fixedCosts": 2000,
            "profitMargin": 30,
        }

        def order():
            return req(
                "POST",
                "/api/v1/orders",
                {"rawText": "Encargo sintético de prueba local", "domain": "general", "attributes": attrs},
                token,
                status=201,
            )["id"]

        order_id = order()
        route = "/api/v1/quotes/recommend/" + order_id
        req("POST", route, costs, token, status=403)
        cold = req("POST", route, costs, baker, status=201)
        check("Inicio sin historial conserva costos", not cold["adapted"] and cold["suggestedTotal"] == 15600)
        req("POST", route, {**costs, "professionalId": "ajeno"}, baker, status=400)
        req("POST", route, {**costs, "laborCost": -1}, baker, status=400)
        req(
            "POST",
            "/api/v1/quotes",
            {
                "orderId": order_id,
                "estimatedPrice": 18000,
                "details": "Historial sintético",
                "breakdown": costs,
                "recommendationId": cold["id"],
            },
            baker,
            status=201,
        )
        req("PATCH", f"/api/v1/orders/{order_id}/status", {"status": "ACCEPTED_BY_CLIENT"}, token)
        for _ in range(2):
            oid = order()
            req(
                "POST",
                "/api/v1/quotes",
                {"orderId": oid, "estimatedPrice": 18000, "details": "Historial sintético", "breakdown": costs},
                baker,
                status=201,
            )
            req("PATCH", f"/api/v1/orders/{oid}/status", {"status": "ACCEPTED_BY_CLIENT"}, token)
        target = order()
        route = "/api/v1/quotes/recommend/" + target
        adaptive = req("POST", route, costs, baker, status=201)
        baseline = req("POST", route, {**costs, "mode": "baseline"}, baker, status=201)
        check(
            "Tres aceptados producen adaptación persistida",
            adaptive["adapted"] and adaptive["sampleCount"] == 3 and adaptive["suggestedTotal"] == 15960,
        )
        check("Comparación base conserva 15600", baseline["suggestedTotal"] == 15600 and not baseline["adapted"])
        req(
            "POST",
            "/api/v1/quotes",
            {
                "orderId": target,
                "estimatedPrice": 15960,
                "details": "Costos modificados",
                "breakdown": {**costs, "laborCost": 1},
                "recommendationId": adaptive["id"],
            },
            baker,
            status=400,
        )
        req(
            "POST",
            "/api/v1/quotes",
            {
                "orderId": target,
                "estimatedPrice": 15960,
                "details": "Recomendación revisada",
                "breakdown": costs,
                "recommendationId": adaptive["id"],
            },
            baker,
            status=201,
        )
        req("PATCH", f"/api/v1/orders/{target}/status", {"status": "REJECTED_BY_CLIENT"}, other, status=403)
        req("PATCH", f"/api/v1/orders/{target}/status", {"status": "REJECTED_BY_CLIENT"}, token)
        req("POST", route, costs, baker, status=409)
        req("PATCH", "/auth/account", {"name": "Nombre actualizado"}, token)
        exported = req("GET", "/auth/account", token=token)
        check(
            "Exportación propia sin hash ni secretos",
            exported["name"] == "Nombre actualizado" and "password" not in exported and len(exported["orders"]) == 4,
        )
        other_export = req("GET", "/auth/account", token=other)
        check("Exportación aislada por usuario", len(other_export["orders"]) == 0)
        req("DELETE", "/auth/account", {"password": "incorrecta"}, token, status=401)
        # Solo se eliminan las cuentas sintéticas creadas en este mismo proceso.
        req("DELETE", "/auth/account", {"password": password}, token)
        req("GET", "/auth/account", token=token, status=401)
        req("DELETE", "/auth/account", {"password": password}, other)
        req("PUT", "/api/v1/quotes/profile", profile_before, baker)
        check(
            "Ningún pedido sintético del cliente eliminado permanece",
            all(
                o["attributes"].get("service_type") != attrs["service_type"]
                for o in req("GET", "/api/v1/orders", token=baker)
                if o.get("attributes")
            ),
        )

    report = {
        "dataType": "synthetic-local-integration",
        "baseUrl": base,
        "checksPassed": len(checks),
        "checks": checks,
        "adaptive": {
            key: adaptive[key]
            for key in ("version", "adapted", "sampleCount", "suggestedTotal", "baselineTotal", "reasons")
        },
        "limitations": [
            "No acredita ejecución en Render ni evaluación con personas.",
            "Las cuentas sintéticas se eliminan al terminar correctamente.",
        ],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Integración final local: {len(checks)} comprobaciones correctas; sin credenciales en el informe")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:18080")
    parser.add_argument("--output", type=Path, default=Path("docs/evidence/final-local/integration.json"))
    args = parser.parse_args()
    run(args.base, args.output)
