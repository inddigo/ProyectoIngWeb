from fastapi import FastAPI
from app.api import router

app = FastAPI(
    title="Pastry Adaptative NLP & Web Service",
    description="Servicio especializado de Procesamiento de Lenguaje Natural y Búsqueda Web de Referencias para Pastelería",
    version="1.0.0"
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "service-python"}

app.include_router(router, prefix="/api/v1")
