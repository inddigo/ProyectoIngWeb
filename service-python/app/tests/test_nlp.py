from app.nlp.engine import nlp_engine


def test_extract_servings():
    assert nlp_engine.extract_servings("Quiero una torta para 20 personas") == 20


def test_extract_servings_fallback():
    assert nlp_engine.extract_servings("Torta pequeña") == 10


def test_extract_theme():
    theme = nlp_engine.extract_theme("torta de cumpleaños temática de batman")
    assert "batman" in theme.lower()


def test_extract_dietary():
    restrictions = nlp_engine.extract_dietary("pastel vegano y sin gluten")
    assert "Vegana" in restrictions
    assert "Sin Gluten" in restrictions


def test_extract_flavors():
    flavors = nlp_engine.extract_flavors("sabor a chocolate y vainilla")
    assert "Chocolate" in flavors
    assert "Vainilla" in flavors


def test_confidence_is_lower_when_information_is_missing():
    _, complete = nlp_engine.extract("cake", "torta de chocolate para 30 personas temática de boda")
    _, vague = nlp_engine.extract("cake", "quiero una torta bonita")
    assert complete > vague
    assert 0 < vague < 0.5


def test_tattoo_black_and_white():
    entities = nlp_engine.extract_tattoo_entities("tatuaje de 8 cm en la muñeca en blanco y negro")
    assert entities == {"size": "8 cm", "style": "Blanco y Negro", "body_part": "Muñeca"}
