import pytest
from app.nlp.engine import nlp_engine

def test_extract_servings():
    text = "Quiero una torta para 20 personas"
    assert nlp_engine.extract_servings(text) == 20

def test_extract_servings_fallback():
    text = "Torta pequeña"
    assert nlp_engine.extract_servings(text) == 10

def test_extract_theme():
    text = "torta de cumpleaños temática de batman"
    theme = nlp_engine.extract_theme(text)
    assert "batman" in theme.lower() or "cumpleaños" in theme.lower()

def test_extract_dietary():
    text = "pastel vegano y sin gluten"
    restrictions = nlp_engine.extract_dietary(text)
    assert "Vegana" in restrictions
    assert "Sin Gluten" in restrictions

def test_extract_flavors():
    text = "sabor a chocolate y vainilla"
    flavors = nlp_engine.extract_flavors(text)
    assert "Chocolate" in flavors
    assert "Vainilla" in flavors
