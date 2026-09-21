from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
from app.nlp.engine import nlp_engine
from app.services.scraper import web_scraper

router = APIRouter()

class OrderInput(BaseModel):
    raw_text: str

class ExtractedEntities(BaseModel):
    servings: int
    theme: str
    dietary_restrictions: List[str]
    flavors: List[str]
    confidence_score: float

class WebReference(BaseModel):
    title: str
    image_url: str
    source: str

class StructuredOrderResponse(BaseModel):
    raw_text: str
    entities: ExtractedEntities
    web_references: List[WebReference]

@router.post("/nlp/structure-order", response_model=StructuredOrderResponse)
async def structure_order(payload: OrderInput):
    text = payload.raw_text
    
    # NLP
    servings = nlp_engine.extract_servings(text)
    theme = nlp_engine.extract_theme(text)
    restrictions = nlp_engine.extract_dietary(text)
    flavors = nlp_engine.extract_flavors(text)
    
    entities = ExtractedEntities(
        servings=servings,
        theme=theme,
        dietary_restrictions=restrictions,
        flavors=flavors,
        confidence_score=0.92
    )

    # Scraper asíncrono
    raw_refs = await web_scraper.get_references(theme, flavors)
    references = [WebReference(**ref) for ref in raw_refs]

    return StructuredOrderResponse(
        raw_text=text,
        entities=entities,
        web_references=references
    )
