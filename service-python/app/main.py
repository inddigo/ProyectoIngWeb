import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("service-python")

app = FastAPI(
    title="Servicio NLP y Referencias Web",
    description="Extrae atributos estructurados desde texto libre por rubro y obtiene referencias visuales de la Web.",
    version="1.1.0",
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Los errores de validación (422) los maneja FastAPI; aquí solo lo inesperado.
    logger.exception("Error no controlado en %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Error interno del servicio NLP"})


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "service-python"}


app.include_router(router, prefix="/api/v1")
