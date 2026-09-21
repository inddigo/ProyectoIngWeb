import spacy
from typing import List
import re

# Si no está instalado el modelo, bajamos el de español mediano
try:
    nlp = spacy.load("es_core_news_md")
except OSError:
    import spacy.cli
    spacy.cli.download("es_core_news_md")
    nlp = spacy.load("es_core_news_md")

class AdvancedNLPEngine:
    """Motor de NLP Adaptativo usando spaCy y Regex para extracción de pastelería."""
    
    def extract_servings(self, text: str) -> int:
        doc = nlp(text.lower())
        for token in doc:
            if token.like_num and token.head.text in ["personas", "porciones", "trozos"]:
                try:
                    return int(token.text)
                except ValueError:
                    pass
        # Fallback regex
        match = re.search(r'(\d+)\s*(personas|porciones|trozos)', text.lower())
        return int(match.group(1)) if match else 10

    def extract_theme(self, text: str) -> str:
        # Detectar la palabra clave 'temática' y tomar el objeto posterior
        doc = nlp(text.lower())
        for token in doc:
            if token.lemma_ == "temático" or token.text == "temática":
                # Tomamos los descendientes (ej: 'de superhéroes')
                children = [child.text.capitalize() for child in token.rights if child.pos_ in ["NOUN", "PROPN"]]
                if children:
                    return " ".join(children)

        if "boda" in text.lower() or "matrimonio" in text.lower():
            return "Boda"
        if "cumpleaño" in text.lower():
            return "Cumpleaños"
        return "Personalizada"

    def extract_dietary(self, text: str) -> List[str]:
        text = text.lower()
        restrictions = []
        if "vegana" in text or "vegano" in text:
            restrictions.append("Vegana")
        if "sin lactosa" in text or "sin leche" in text or "deslactosado" in text:
            restrictions.append("Sin Lactosa")
        if "sin gluten" in text or "celiaco" in text:
            restrictions.append("Sin Gluten")
        return restrictions

    def extract_flavors(self, text: str) -> List[str]:
        flavors = []
        doc = nlp(text.lower())
        target_flavors = {"chocolate", "vainilla", "manjar", "lucuma", "lúcuma", "fresa", "frutilla", "zanahoria"}
        
        for token in doc:
            if token.lemma_ in target_flavors:
                flavors.append(token.text.capitalize())
                
        return flavors if flavors else ["Tradicional"]

nlp_engine = AdvancedNLPEngine()
