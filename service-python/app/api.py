from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from app.nlp.engine import nlp_engine
from app.services.scraper import web_scraper

router = APIRouter()

# Mantener sincronizado con backend-nestjs/src/common/constants/domains.ts
SUPPORTED_DOMAINS = ("cake", "tattoo")
Domain = Literal["cake", "tattoo"]

EVALUATION_BENCHMARK: list[dict[str, Any]] = [
    {
        "domain": "cake",
        "text": "Quiero una torta vegana de chocolate para 20 personas con temática de Batman",
        "expected": {"servings": 20, "theme": "Batman", "flavors": ["Chocolate"], "dietary_restrictions": ["Vegana"]},
    },
    {
        "domain": "cake",
        "text": "Pastel de boda para 80 invitados sabor vainilla y frutilla sin lactosa",
        "expected": {
            "servings": 80,
            "theme": "Boda",
            "flavors": ["Vainilla", "Frutilla"],
            "dietary_restrictions": ["Sin Lactosa"],
        },
    },
    {
        "domain": "cake",
        "text": "Torta de cumpleaños para 15 porciones de red velvet sin gluten",
        "expected": {
            "servings": 15,
            "theme": "Cumpleaños",
            "flavors": ["Red velvet"],
            "dietary_restrictions": ["Sin Gluten"],
        },
    },
    {
        "domain": "tattoo",
        "text": "Quiero un tatuaje de 15 cm en el antebrazo a color",
        "expected": {"size": "15 cm", "style": "A color", "body_part": "Antebrazo"},
    },
    {
        "domain": "tattoo",
        "text": "Tatuaje de 8 cm en la muñeca en blanco y negro",
        "expected": {"size": "8 cm", "style": "Blanco y Negro", "body_part": "Muñeca"},
    },
    {
        "domain": "tattoo",
        "text": "Diseño en acuarela de 12 cm en la espalda",
        "expected": {"size": "12 cm", "style": "Acuarela", "body_part": "Espalda"},
    },
]


class OrderInput(BaseModel):
    raw_text: str = Field(min_length=5, max_length=2000)
    domain: Domain = "cake"

    @field_validator("raw_text")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 5:
            raise ValueError("el texto debe tener al menos 5 caracteres")
        return value


class WebReference(BaseModel):
    title: str
    image_url: str
    source: str
    source_url: str | None = None
    license: str | None = None
    creator: str | None = None
    query_used: str | None = None
    retrieved_at: str | None = None


class ExtractionMeta(BaseModel):
    query_used: str
    raw_count: int
    valid_count: int
    invalid_dropped: int
    duplicates_removed: int
    cache_hit: bool
    fallback_used: bool
    latency_ms: float


class StructuredOrderResponse(BaseModel):
    raw_text: str
    domain: Domain
    entities: dict[str, Any]
    web_references: list[WebReference]
    extraction_meta: ExtractionMeta | None = None


def evaluate_nlp_benchmark() -> dict[str, Any]:
    """Ejecuta el conjunto de prueba reproducible y calcula precisión y exhaustividad de extracción."""
    total_fields = 0
    matched_fields = 0
    for case in EVALUATION_BENCHMARK:
        extracted, _ = nlp_engine.extract(case["domain"], case["text"])
        for key, expected_val in case["expected"].items():
            total_fields += 1
            actual_val = extracted.get(key)
            if isinstance(expected_val, str) and isinstance(actual_val, str):
                if expected_val.lower() in actual_val.lower():
                    matched_fields += 1
            elif actual_val == expected_val:
                matched_fields += 1

    precision_pct = round((matched_fields / total_fields) * 100, 2) if total_fields else 100.0
    return {
        "benchmark_cases": len(EVALUATION_BENCHMARK),
        "evaluated_fields": total_fields,
        "matched_fields": matched_fields,
        "entity_extraction_accuracy_pct": precision_pct,
    }


@router.post("/nlp/structure-order", response_model=StructuredOrderResponse)
async def structure_order(payload: OrderInput) -> StructuredOrderResponse:
    entities, confidence = nlp_engine.extract(payload.domain, payload.raw_text)
    entities["confidence_score"] = confidence

    query = entities.get("theme") or entities.get("style") or ""
    raw_refs, meta = await web_scraper.get_references_with_meta(payload.domain, str(query))

    return StructuredOrderResponse(
        raw_text=payload.raw_text,
        domain=payload.domain,
        entities=entities,
        web_references=[WebReference(**ref) for ref in raw_refs],
        extraction_meta=ExtractionMeta(**meta),
    )


@router.get("/nlp/metrics")
def get_metrics() -> dict[str, Any]:
    return {
        "web_retrieval": web_scraper.get_metrics(),
        "nlp_benchmark": evaluate_nlp_benchmark(),
    }

