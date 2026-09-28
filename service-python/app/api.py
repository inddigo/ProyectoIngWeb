from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field, field_validator

from app.nlp.engine import nlp_engine
from app.services.scraper import web_scraper

router = APIRouter()

# Mantener sincronizado con backend-nestjs/src/common/constants/domains.ts
SUPPORTED_DOMAINS = ("cake", "tattoo")
Domain = Literal["cake", "tattoo"]


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


class StructuredOrderResponse(BaseModel):
    raw_text: str
    domain: Domain
    entities: dict[str, Any]
    web_references: list[WebReference]


@router.post("/nlp/structure-order", response_model=StructuredOrderResponse)
async def structure_order(payload: OrderInput) -> StructuredOrderResponse:
    entities, confidence = nlp_engine.extract(payload.domain, payload.raw_text)
    entities["confidence_score"] = confidence

    query = entities.get("theme") or entities.get("style") or ""
    raw_refs = await web_scraper.get_references(payload.domain, str(query))

    return StructuredOrderResponse(
        raw_text=payload.raw_text,
        domain=payload.domain,
        entities=entities,
        web_references=[WebReference(**ref) for ref in raw_refs],
    )
