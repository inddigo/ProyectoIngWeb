from app.nlp.engine import nlp_engine


def test_extract_servings():
    assert nlp_engine.extract_servings("Quiero una torta para 20 personas") == 20


def test_extract_servings_spanish_words_and_children():
    text = "Quiero cotizar un pastel infantil con diseño de Spiderman para veinticinco niños"
    assert nlp_engine.extract_servings(text) == 25


def test_extract_servings_fallback():
    assert nlp_engine.extract_servings("Torta pequeña") == 10


def test_extract_theme():
    theme = nlp_engine.extract_theme("torta de cumpleaños temática de batman")
    assert "batman" in theme.lower()


def test_extract_theme_multiword_without_bleeding():
    text = "Hola, necesito una torta con temática de Star Wars para 30 personas rellena de lúcuma y chocolate"
    entities, confidence = nlp_engine.extract("cake", text)
    assert entities["theme"] == "Star Wars"
    assert entities["servings"] == 30
    assert entities["flavors"] == ["Lúcuma", "Chocolate"]
    assert confidence == 0.95


def test_extract_dietary():
    restrictions = nlp_engine.extract_dietary("pastel vegano y sin gluten")
    assert "Vegana" in restrictions
    assert "Sin Gluten" in restrictions


def test_extract_dietary_coordinated_negation_and_intolerance():
    c3_text = "Torta de cumpleaños para 15 porciones de red velvet y manjar sin gluten ni azúcar"
    c3 = nlp_engine.extract_dietary(c3_text)
    assert "Sin Gluten" in c3
    assert "Sin Azúcar" in c3

    c6_text = "Torta aniversario de naranja, apta para diabéticos e intolerantes a la lactosa"
    c6 = nlp_engine.extract_dietary(c6_text)
    assert "Sin Azúcar" in c6
    assert "Sin Lactosa" in c6


def test_extract_flavors():
    flavors = nlp_engine.extract_flavors("sabor a chocolate y vainilla")
    assert "Chocolate" in flavors
    assert "Vainilla" in flavors


def test_extract_challenging_cake_cases_c5_and_c6():
    c5_text = "Pastel con diseño de Spiderman para veinticinco niños de tres leches con frambuesa y maracuyá"
    c5, conf5 = nlp_engine.extract("cake", c5_text)
    assert c5["servings"] == 25
    assert c5["theme"] == "Spiderman"
    assert c5["flavors"] == ["Tres leches", "Frambuesa", "Maracuyá"]
    assert conf5 == 0.95

    c6_text = "Torta aniversario para 12 personas de naranja y pistacho, diabéticos e intolerantes a la lactosa"
    c6, conf6 = nlp_engine.extract("cake", c6_text)
    assert c6["servings"] == 12
    assert c6["theme"] == "Aniversario"
    assert c6["flavors"] == ["Naranja", "Pistacho"]
    assert "Sin Azúcar" in c6["dietary_restrictions"]
    assert "Sin Lactosa" in c6["dietary_restrictions"]
    assert conf6 == 0.95


def test_confidence_is_lower_when_information_is_missing():
    _, complete = nlp_engine.extract("cake", "torta de chocolate para 30 personas temática de boda")
    _, vague = nlp_engine.extract("cake", "quiero una torta bonita")
    assert complete > vague
    assert 0 < vague < 0.5


def test_tattoo_black_and_white():
    entities = nlp_engine.extract_tattoo_entities("tatuaje de 8 cm en la muñeca en blanco y negro")
    assert entities == {"size": "8 cm", "style": "Blanco y Negro", "body_part": "Muñeca"}


def test_tattoo_challenging_cases_t4_t5_t6():
    t4_text = "Busco hacerme un león realista de 15x10 cm en el hombro con sombreado"
    t4, conf4 = nlp_engine.extract("tattoo", t4_text)
    assert t4 == {"size": "15x10 cm", "style": "Realista / Sombreado", "body_part": "Hombro"}
    assert conf4 == 0.95

    t5_text = "Tatuaje minimalista de línea fina de 5.5 cm en la clavícula"
    t5, conf5 = nlp_engine.extract("tattoo", t5_text)
    assert t5 == {"size": "5.5 cm", "style": "Minimalista / Línea fina", "body_part": "Clavícula"}
    assert conf5 == 0.95

    t6_text = "Quiero un dragón estilo tradicional japonés a full color de 25 cm en la pantorrilla"
    t6, conf6 = nlp_engine.extract("tattoo", t6_text)
    assert t6 == {"size": "25 cm", "style": "Tradicional japonés / A color", "body_part": "Pantorrilla"}
    assert conf6 == 0.95


def test_build_search_query_produces_distinct_english_queries():
    c1_text = "Quiero una torta para 20 personas con diseño de Spiderman, sabor chocolate y vainilla"
    c1_entities, _ = nlp_engine.extract("cake", c1_text)
    assert nlp_engine.build_search_query("cake", c1_text, c1_entities) == "spiderman chocolate"

    c5_text = "Cotizar pastel para veinticinco niños de tres leches con frambuesa"
    c5_entities, _ = nlp_engine.extract("cake", c5_text)
    assert nlp_engine.build_search_query("cake", c5_text, c5_entities) == "kids birthday tres leches"

    t4_text = "Me gustaría cotizar un león realista con sombreado de 15x10 cm en el hombro"
    t4_entities, _ = nlp_engine.extract("tattoo", t4_text)
    assert nlp_engine.build_search_query("tattoo", t4_text, t4_entities) == "lion realistic"

    t6_text = "Quiero un dragón estilo tradicional japonés a full color de 25 cm en la pantorrilla"
    t6_entities, _ = nlp_engine.extract("tattoo", t6_text)
    assert nlp_engine.build_search_query("tattoo", t6_text, t6_entities) == "dragon japanese"


def test_external_query_never_includes_free_text_theme_or_contact_details():
    for theme in ("Ana Perez 987654321", "ana@example.org", "Calle Ficticia 123", "Un nombre privado"):
        text = f"Quiero una torta con temática de {theme} para 20 personas de chocolate"
        entities, _ = nlp_engine.extract("cake", text)
        assert nlp_engine.build_search_query("cake", text, entities) == "chocolate"
    assert (
        nlp_engine.build_search_query("cake", "", {"theme": "Ana Perez", "flavors": ["private@example.org"]})
        == "chocolate"
    )
