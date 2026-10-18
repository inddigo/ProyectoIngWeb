import json
import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from app.api import router
from app.services.scraper import web_scraper

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("service-python")


def log_structured(level: str, event: str, **kwargs: Any) -> None:
    payload = {
        "timestamp": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "level": level,
        "service": "service-python",
        "event": event,
        **kwargs,
    }
    msg = json.dumps(payload, ensure_ascii=False)
    if level == "ERROR":
        logger.error(msg)
    elif level == "WARN":
        logger.warning(msg)
    else:
        logger.info(msg)


app = FastAPI(
    title="Servicio NLP y Referencias Web",
    description="Extrae atributos estructurados desde texto libre por rubro y obtiene referencias visuales de la Web.",
    version="1.2.0",
)


@app.middleware("http")
async def correlation_and_logging_middleware(request: Request, call_next: Any) -> Response:
    correlation_id = request.headers.get("x-correlation-id") or request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.correlation_id = correlation_id

    start = time.perf_counter()

    response: Response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Correlation-Id"] = correlation_id

    log_structured(
        "INFO",
        "http_request",
        correlationId=correlation_id,
        method=request.method,
        path=request.url.path,
        statusCode=response.status_code,
        durationMs=duration_ms,
    )
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Los errores de validación (422) los maneja FastAPI; aquí solo lo inesperado.
    correlation_id = getattr(request.state, "correlation_id", str(uuid.uuid4()))
    log_structured(
        "ERROR",
        "unhandled_exception",
        correlationId=correlation_id,
        path=request.url.path,
        error=str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Error interno del servicio NLP", "correlationId": correlation_id},
        headers={"X-Correlation-Id": correlation_id},
    )


@app.get("/health")
def health_check() -> dict[str, Any]:
    metrics = web_scraper.get_metrics()
    return {
        "status": "ok",
        "service": "service-python",
        "external_source": {
            "provider": "openverse",
            "status": "degraded" if metrics["last_error"] and metrics["valid_records_kept"] == 0 else "ready",
            "avg_latency_ms": metrics["avg_latency_ms"],
            "cache_entries": metrics["active_cache_entries"],
        },
    }


app.include_router(router, prefix="/api/v1")

