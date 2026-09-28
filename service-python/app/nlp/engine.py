"""Motor NLP basado en reglas + spaCy para extraer atributos por rubro."""

import re
from typing import Any

import spacy

try:
    nlp = spacy.load("es_core_news_md")
except OSError:  # pragma: no cover - solo si el modelo no viene preinstalado
    import spacy.cli

    spacy.cli.download("es_core_news_md")
    nlp = spacy.load("es_core_news_md")

DEFAULT_SERVINGS = 10
TARGET_FLAVORS = {
    "chocolate",
    "vainilla",
    "manjar",
    "lucuma",
    "lúcuma",
    "fresa",
    "frutilla",
    "zanahoria",
    "limón",
    "limon",
    "coco",
    "red velvet",
}
BODY_PARTS = [
    "antebrazo",
    "brazo",
    "espalda",
    "pierna",
    "pecho",
    "cuello",
    "mano",
    "muñeca",
    "tobillo",
    "hombro",
    "costilla",
]


class AdvancedNLPEngine:
    """Extrae entidades de texto libre. Cada extractor indica si el valor fue
    detectado en el texto o si es un valor por defecto; con eso se calcula
    la confianza del resultado."""

    # ---------- Pastelería ----------
    def extract_servings(self, text: str) -> int:
        value = self._find_servings(text)
        return value if value is not None else DEFAULT_SERVINGS

    def _find_servings(self, text: str) -> int | None:
        doc = nlp(text.lower())
        for token in doc:
            if token.like_num and token.head.text in ["personas", "porciones", "trozos"]:
                try:
                    return int(token.text)
                except ValueError:
                    pass
        match = re.search(r"(\d+)\s*(personas|porciones|trozos|invitados)", text.lower())
        return int(match.group(1)) if match else None

    def extract_theme(self, text: str) -> str:
        return self._find_theme(text) or "Personalizada"

    def _find_theme(self, text: str) -> str | None:
        lower = text.lower()
        doc = nlp(lower)
        for token in doc:
            if token.lemma_ == "temático" or token.text in ("temática", "tematica"):
                # descendientes a la derecha: "temática de batman" -> "Batman"
                children = [
                    t.text.capitalize() for t in token.subtree if t.i > token.i and t.pos_ in ["NOUN", "PROPN", "ADJ"]
                ]
                if children:
                    return " ".join(children)
        match = re.search(r"tem[aá]tica\s+(?:de\s+)?([a-záéíóúñ ]+?)(?:[,.]|\s+con\s|\s+para\s|$)", lower)
        if match:
            return match.group(1).strip().title()
        if "boda" in lower or "matrimonio" in lower:
            return "Boda"
        if "cumpleaño" in lower:
            return "Cumpleaños"
        return None

    def extract_dietary(self, text: str) -> list[str]:
        text = text.lower()
        restrictions = []
        if "vegana" in text or "vegano" in text:
            restrictions.append("Vegana")
        if "sin lactosa" in text or "sin leche" in text or "deslactosado" in text:
            restrictions.append("Sin Lactosa")
        if "sin gluten" in text or "celiac" in text or "celíac" in text:
            restrictions.append("Sin Gluten")
        if "sin azúcar" in text or "sin azucar" in text or "diabétic" in text:
            restrictions.append("Sin Azúcar")
        return restrictions

    def extract_flavors(self, text: str) -> list[str]:
        return self._find_flavors(text) or ["Tradicional"]

    def _find_flavors(self, text: str) -> list[str]:
        lower = text.lower()
        flavors: list[str] = []
        for token in nlp(lower):
            if token.lemma_ in TARGET_FLAVORS or token.text in TARGET_FLAVORS:
                flavor = token.text.capitalize()
                if flavor not in flavors:
                    flavors.append(flavor)
        if "red velvet" in lower and "Red velvet" not in flavors:
            flavors.append("Red velvet")
        return flavors

    def extract_cake_entities(self, text: str) -> tuple[dict[str, Any], float]:
        servings = self._find_servings(text)
        theme = self._find_theme(text)
        flavors = self._find_flavors(text)
        restrictions = self.extract_dietary(text)
        entities = {
            "servings": servings if servings is not None else DEFAULT_SERVINGS,
            "theme": theme or "Personalizada",
            "dietary_restrictions": restrictions,
            "flavors": flavors or ["Tradicional"],
        }
        # Las restricciones son opcionales: no penalizan si no aparecen.
        detected = [servings is not None, theme is not None, bool(flavors)]
        return entities, _confidence(detected)

    # ---------- Tatuajes ----------
    def extract_tattoo_entities(self, text: str) -> dict[str, Any]:
        return self._tattoo(text)[0]

    def _tattoo(self, text: str) -> tuple[dict[str, Any], float]:
        lower = text.lower()

        size_match = re.search(r"(\d+)\s*(cm|centimetros|centímetros)", lower)
        size = f"{size_match.group(1)} cm" if size_match else None

        style = None
        if "acuarela" in lower:
            style = "Acuarela"
        elif "blanco y negro" in lower or "negro" in lower or "sombreado" in lower:
            style = "Blanco y Negro"
        elif "color" in lower:
            style = "A color"

        part = next((p.capitalize() for p in BODY_PARTS if p in lower), None)

        entities = {
            "size": size or "No especificado",
            "style": style or "Blanco y Negro",
            "body_part": part or "No especificada",
        }
        return entities, _confidence([size is not None, style is not None, part is not None])

    # ---------- Punto de entrada ----------
    def extract(self, domain: str, text: str) -> tuple[dict[str, Any], float]:
        if domain == "tattoo":
            return self._tattoo(text)
        return self.extract_cake_entities(text)


def _confidence(detected: list[bool]) -> float:
    """Proporción de campos obligatorios detectados explícitamente (0.3 - 0.95)."""
    ratio = sum(detected) / len(detected)
    return round(0.3 + 0.65 * ratio, 2)


nlp_engine = AdvancedNLPEngine()
