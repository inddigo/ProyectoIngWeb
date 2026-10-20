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

SPANISH_NUMBERS: dict[str, int] = {
    "un": 1,
    "uno": 1,
    "una": 1,
    "dos": 2,
    "tres": 3,
    "cuatro": 4,
    "cinco": 5,
    "seis": 6,
    "siete": 7,
    "ocho": 8,
    "nueve": 9,
    "diez": 10,
    "once": 11,
    "doce": 12,
    "trece": 13,
    "catorce": 14,
    "quince": 15,
    "dieciseis": 16,
    "dieciséis": 16,
    "diecisiete": 17,
    "dieciocho": 18,
    "diecinueve": 19,
    "veinte": 20,
    "veintiun": 21,
    "veintiún": 21,
    "veintiuno": 21,
    "veintidos": 22,
    "veintidós": 22,
    "veintitres": 23,
    "veintitrés": 23,
    "veinticuatro": 24,
    "veinticinco": 25,
    "veintiseis": 26,
    "veintiséis": 26,
    "veintisiete": 27,
    "veintiocho": 28,
    "veintinueve": 29,
    "treinta": 30,
    "cuarenta": 40,
    "cincuenta": 50,
    "sesenta": 60,
    "setenta": 70,
    "ochenta": 80,
    "noventa": 90,
    "cien": 100,
    "ciento": 100,
    "doscientos": 200,
    "doscientas": 200,
}

SERVING_NOUNS = (
    "personas",
    "persona",
    "porciones",
    "porcion",
    "porción",
    "trozos",
    "trozo",
    "invitados",
    "invitadas",
    "niños",
    "niñas",
    "ninos",
    "ninas",
    "adultos",
    "comensales",
    "gente",
    "asistentes",
    "pedazos",
    "raciones",
)

# Catálogo de sabores (patrones -> nombre canónico normalizado)
FLAVOR_CATALOG: list[tuple[tuple[str, ...], str]] = [
    (("tres leches", "3 leches"), "Tres leches"),
    (("red velvet", "terciopelo rojo"), "Red velvet"),
    (("selva negra",), "Selva negra"),
    (("mil hojas", "milhojas"), "Mil hojas"),
    (("frutos rojos", "berries", "frutos del bosque"), "Frutos rojos"),
    (("chocolate blanco",), "Chocolate blanco"),
    (("dulce de leche",), "Dulce de leche"),
    (("pie de limon", "pie de limón"), "Pie de limón"),
    (("chocolate", "cacao"), "Chocolate"),
    (("vainilla",), "Vainilla"),
    (("manjar", "arequipe"), "Manjar"),
    (("lucuma", "lúcuma"), "Lúcuma"),
    (("frutilla", "frutillas"), "Frutilla"),
    (("fresa", "fresas"), "Fresa"),
    (("frambuesa", "frambuesas"), "Frambuesa"),
    (("maracuya", "maracuyá", "parchita"), "Maracuyá"),
    (("naranja", "naranjas"), "Naranja"),
    (("pistacho", "pistachos"), "Pistacho"),
    (("nutella", "avellana", "avellanas"), "Nutella"),
    (("zanahoria", "carrot"), "Zanahoria"),
    (("limon", "limón"), "Limón"),
    (("coco",), "Coco"),
    (("oreo",), "Oreo"),
    (("moka", "mocca", "cafe", "café"), "Café / Moka"),
    (("arandano", "arándano", "arandanos", "arándanos"), "Arándano"),
    (("durazno", "duraznos", "melocoton", "melocotón"), "Durazno"),
    (("pina", "piña"), "Piña"),
    (("platano", "plátano", "banana"), "Plátano"),
    (("almendra", "almendras"), "Almendra"),
    (("nuez", "nueces"), "Nuez"),
    (("merengue",), "Merengue"),
    (("hojarasca",), "Hojarasca"),
    (("amapola", "amapolas"), "Amapola"),
    (("cheesecake", "queso crema"), "Cheesecake"),
    (("caramelo", "toffee"), "Caramelo"),
]

EVENT_THEMES: list[tuple[tuple[str, ...], str]] = [
    (("boda", "bodas", "matrimonio", "novios", "nupcial"), "Boda"),
    (("cumpleaño", "cumpleaños", "cumpleanos", "cumple"), "Cumpleaños"),
    (("aniversario",), "Aniversario"),
    (("bautizo", "bautismo"), "Bautizo"),
    (("baby shower", "babyshower", "revelacion de genero", "revelación de género"), "Baby Shower"),
    (("graduacion", "graduación", "titulacion", "titulación", "licenciatura"), "Graduación"),
    (("primera comunion", "primera comunión", "comunion", "comunión"), "Primera Comunión"),
    (("halloween",), "Halloween"),
    (("navidad", "navideñ"), "Navidad"),
    (("san valentin", "san valentín", "enamorados"), "San Valentín"),
    (("despedida de solter",), "Despedida de Soltero/a"),
    (("quinceañera", "15 años", "quince años"), "Quinceañera"),
    (("infantil",), "Infantil"),
]

# Zonas del cuerpo ordenadas de más específica a más general
BODY_PARTS_CATALOG: list[tuple[tuple[str, ...], str]] = [
    (("antebrazo", "antebrazos"), "Antebrazo"),
    (("clavicula", "clavícula", "claviculas", "clavículas"), "Clavícula"),
    (("pantorrilla", "pantorrillas", "gemelo", "gemelos"), "Pantorrilla"),
    (("omoplato", "omóplato", "omoplatos", "omóplatos", "escapula", "escápula"), "Omóplato"),
    (("costilla", "costillas", "costado"), "Costilla"),
    (("muñeca", "muneca", "muñecas", "munecas"), "Muñeca"),
    (("tobillo", "tobillos"), "Tobillo"),
    (("hombro", "hombros", "deltoides"), "Hombro"),
    (("biceps", "bíceps"), "Bíceps"),
    (("triceps", "tríceps"), "Tríceps"),
    (("muslo", "muslos", "cuadriceps", "cuádriceps"), "Muslo"),
    (("espinilla", "canilla", "tibia"), "Espinilla"),
    (("espalda", "columna", "lumbar"), "Espalda"),
    (("pecho", "pectoral", "esternon", "esternón"), "Pecho"),
    (("cuello", "nuca", "garganta"), "Cuello"),
    (("cadera", "caderas", "pelvis"), "Cadera"),
    (("abdomen", "vientre", "estomago", "estómago"), "Abdomen"),
    (("mano", "manos", "dedo", "dedos", "nudillo", "nudillos"), "Mano"),
    (("pie", "pies", "empeine"), "Pie"),
    (("pierna", "piernas"), "Pierna"),
    (("brazo", "brazos", "manga"), "Brazo"),
]

TATTOO_ART_STYLES: list[tuple[tuple[str, ...], str]] = [
    (("tradicional japones", "tradicional japonés", "irezumi", "oriental"), "Tradicional japonés"),
    (("japones", "japonés"), "Tradicional japonés"),
    (("neotradicional", "neo tradicional", "neo-tradicional"), "Neotradicional"),
    (("tradicional", "old school", "clasico", "clásico"), "Tradicional"),
    (("realista", "realismo", "microrealismo", "hiperrealista", "hiperrealismo"), "Realista"),
    (("minimalista", "minimalismo", "minimal"), "Minimalista"),
    (("linea fina", "línea fina", "fine line", "fineline", "trazo fino"), "Línea fina"),
    (("geometrico", "geométrico", "geometria", "geometría", "mandala"), "Geométrico"),
    (("puntillismo", "dotwork", "dot work"), "Puntillismo"),
    (("blackwork", "black work"), "Blackwork"),
    (("tribal", "maori", "maorí", "polinesio"), "Tribal"),
    (("acuarela", "watercolor"), "Acuarela"),
    (("gotico", "gótico", "darkwork", "ignorant"), "Gótico"),
    (("lettering", "caligrafia", "caligrafía", "frase"), "Lettering"),
]

THEME_STOP_WORDS = (
    "para",
    "con",
    "sabor",
    "sabores",
    "rellena",
    "relleno",
    "bizcocho",
    "cubierta",
    "decorada",
    "decorado",
    "sin",
    "apta",
    "apto",
    "libre",
)

LACTOSE_FREE_TERMS = (
    "sin lactosa",
    "sin leche",
    "deslactosad",
    "libre de lactosa",
    "intolerante a la lactosa",
    "intolerantes a la lactosa",
    "intolerancia a la lactosa",
    "sin lácteos",
    "sin lacteos",
)

GLUTEN_FREE_TERMS = (
    "sin gluten",
    "celiac",
    "celíac",
    "libre de gluten",
    "gluten free",
    "sin tacc",
    "intolerante al gluten",
    "intolerantes al gluten",
)

SUGAR_FREE_TERMS = (
    "sin azúcar",
    "sin azucar",
    "diabétic",
    "diabetic",
    "libre de azúcar",
    "libre de azucar",
    "cero azúcar",
    "cero azucar",
    "0 azúcar",
    "0 azucar",
    "endulzada con stevia",
    "endulzada con alulosa",
    "con stevia",
    "con alulosa",
    "keto",
)

CAKE_THEME_EN: dict[str, str] = {
    "boda": "wedding",
    "matrimonio": "wedding",
    "novios": "wedding",
    "cumpleaños": "birthday",
    "cumpleanos": "birthday",
    "aniversario": "anniversary",
    "infantil": "kids birthday",
    "bautizo": "baptism",
    "baby shower": "baby shower",
    "graduación": "graduation",
    "graduacion": "graduation",
    "quinceañera": "quinceanera",
    "comunión": "communion",
    "halloween": "halloween",
    "navidad": "christmas",
    "san valentín": "valentine",
    "unicornio": "unicorn",
    "dinosaurios": "dinosaur",
    "dinosaurio": "dinosaur",
    "princesa": "princess",
    "princesas": "princess",
    "fútbol": "soccer",
    "futbol": "soccer",
    "flores": "floral",
    "floral": "floral",
    "sirena": "mermaid",
    "espacio": "galaxy",
    "galaxia": "galaxy",
    "selva": "safari",
    "safari": "safari",
}

CAKE_FLAVOR_EN: dict[str, str] = {
    "Red velvet": "red velvet",
    "Tres leches": "tres leches",
    "Selva negra": "black forest",
    "Frutos rojos": "berry",
    "Queso crema": "cheesecake",
    "Chocolate": "chocolate",
    "Vainilla": "vanilla",
    "Frutilla": "strawberry",
    "Frambuesa": "raspberry",
    "Limón": "lemon",
    "Naranja": "orange",
    "Lúcuma": "caramel",
    "Manjar": "caramel",
    "Zanahoria": "carrot",
    "Maracuyá": "passion fruit",
    "Coco": "coconut",
    "Café": "coffee",
    "Moka": "mocha",
    "Piña": "pineapple",
    "Durazno": "peach",
    "Arándano": "blueberry",
    "Mango": "mango",
    "Plátano": "banana",
    "Pistacho": "pistachio",
    "Almendra": "almond",
    "Nuez": "walnut",
    "Avellana": "hazelnut",
    "Nutella": "chocolate hazelnut",
    "Oreo": "oreo",
}

TATTOO_MOTIFS_EN: list[tuple[tuple[str, ...], str]] = [
    (("león", "leon", "leona"), "lion"),
    (("lobo", "loba", "lobos"), "wolf"),
    (("tigre", "tigresa"), "tiger"),
    (("dragón", "dragon", "dragones"), "dragon"),
    (("serpiente", "cobra", "víbora", "vibora"), "snake"),
    (("águila", "aguila", "halcón", "halcon", "cuervo"), "eagle"),
    (("búho", "buho", "lechuza"), "owl"),
    (("fénix", "fenix", "ave fenix", "ave fénix"), "phoenix"),
    (("mariposa", "mariposas", "polilla"), "butterfly"),
    (("araña", "arana", "escorpión", "escorpion"), "spider"),
    (("gato", "gatito", "gata", "felino"), "cat"),
    (("perro", "perrito", "cachorro"), "dog"),
    (("caballo", "corcel"), "horse"),
    (("oso", "osa"), "bear"),
    (("elefante",), "elephant"),
    (("koi", "pez", "peces", "carpa"), "koi fish"),
    (("tiburón", "tiburon", "ballena", "pulpo", "medusa"), "ocean"),
    (("rosa", "rosas"), "rose"),
    (("flor", "flores", "floral", "girasol", "loto", "peonía", "peonia", "botánico", "botanico"), "flower"),
    (("árbol", "arbol", "bosque", "pino", "hojas", "rama"), "tree"),
    (("calavera", "cráneo", "craneo", "esqueleto"), "skull"),
    (("samurai", "samurái", "katana", "oni", "geisha"), "samurai"),
    (("ángel", "angel", "alas", "querubín", "querubin"), "angel wings"),
    (("reloj", "arena"), "clock"),
    (("brújula", "brujula"), "compass"),
    (("ancla", "barco", "velero"), "anchor"),
    (("ola", "olas", "mar", "océano", "oceano"), "wave"),
    (("montaña", "montana", "montañas", "cordillera"), "mountain"),
    (("luna", "fases lunares", "media luna"), "moon"),
    (("sol", "estrellas", "estrella", "constelación", "constelacion", "galaxia", "astronauta"), "star"),
    (("corazón", "corazon"), "heart"),
    (("daga", "espada", "cuchillo"), "dagger"),
    (("cruz", "cruces"), "cross"),
    (("corona",), "crown"),
    (("ojo", "ojos"), "eye"),
    (("mandala",), "mandala"),
    (("pluma", "plumas"), "feather"),
]

TATTOO_STYLE_EN: dict[str, str] = {
    "Tradicional japonés": "japanese",
    "Neotradicional": "traditional",
    "Tradicional": "traditional",
    "Realista": "realistic",
    "Minimalista": "minimalist",
    "Línea fina": "fine line",
    "Geométrico": "geometric",
    "Puntillismo": "dotwork",
    "Blackwork": "blackwork",
    "Tribal": "tribal",
    "Acuarela": "watercolor",
    "Gótico": "gothic",
    "Lettering": "lettering",
    "Sombreado": "shading",
    "Blanco y Negro": "black and white",
    "A color": "color",
}

TATTOO_BODY_PART_EN: dict[str, str] = {
    "Antebrazo": "forearm",
    "Brazo": "arm",
    "Hombro": "shoulder",
    "Espalda": "back",
    "Pecho": "chest",
    "Muñeca": "wrist",
    "Tobillo": "ankle",
    "Pierna": "leg",
    "Pantorrilla": "leg",
    "Muslo": "thigh",
    "Cuello": "neck",
    "Mano": "hand",
    "Costilla": "rib",
    "Clavícula": "shoulder",
    "Omóplato": "back",
    "Bíceps": "arm",
    "Tríceps": "arm",
}


class AdvancedNLPEngine:
    """Extrae entidades de texto libre. Cada extractor indica si el valor fue
    detectado en el texto o si es un valor por defecto; con eso se calcula
    la confianza del resultado."""

    # ---------- Pastelería ----------
    def extract_servings(self, text: str) -> int:
        value = self._find_servings(text)
        return value if value is not None else DEFAULT_SERVINGS

    def _find_servings(self, text: str) -> int | None:
        lower = text.lower()
        nouns_pattern = "|".join(SERVING_NOUNS)

        # 1. Número en dígitos seguido de sustantivo objetivo ("20 personas", "25 niños")
        digit_match = re.search(rf"\b(\d+)\s*(?:a\s*(\d+)\s*)?(?:{nouns_pattern})\b", lower)
        if digit_match:
            val = digit_match.group(2) or digit_match.group(1)
            return int(val)

        # 2. Número compuesto en palabras ("treinta y cinco personas", "ciento veinte invitados")
        tens_words = "treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|ciento"
        compound_re = rf"\b({tens_words})\s+(?:y\s+)?([a-záéíóúñ]+)\s+(?:{nouns_pattern})\b"
        compound_match = re.search(compound_re, lower)
        if compound_match:
            tens = SPANISH_NUMBERS.get(compound_match.group(1), 0)
            units = SPANISH_NUMBERS.get(compound_match.group(2), 0)
            if tens and units:
                return tens + units

        # 3. Número simple en palabras seguido de sustantivo ("veinticinco niños", "quince personas")
        word_match = re.search(rf"\b([a-záéíóúñ]+)\s+(?:{nouns_pattern})\b", lower)
        if word_match and word_match.group(1) in SPANISH_NUMBERS:
            return SPANISH_NUMBERS[word_match.group(1)]

        # 4. Respaldo con spaCy para estructuras con palabras intermedias ("20 o 25 personas")
        doc = nlp(lower)
        for token in doc:
            if token.head.text in SERVING_NOUNS:
                if token.like_num and token.text.isdigit():
                    return int(token.text)
                if token.text in SPANISH_NUMBERS:
                    return SPANISH_NUMBERS[token.text]
        return None

    def extract_theme(self, text: str) -> str:
        return self._find_theme(text) or "Personalizada"

    def _find_theme(self, text: str) -> str | None:
        lower = text.lower()

        # 1. Frase explícita de temática/diseño/motivo acotada antes de conectores de relleno/porciones
        stops = "|".join(THEME_STOP_WORDS) + r"|de\s+\d+|que\s+|y\s+sabor|y\s+rellen"
        triggers = r"tem[aá]tica|dise[ñn]o|motivo|inspirad[ao]\s+en|ambientad[ao]\s+en|personajes?\s+de|estilo"
        articles = r"de\s+|del\s+|la\s+|el\s+|los\s+|las\s+"
        explicit_pattern = rf"(?:{triggers})\s+(?:{articles})?([a-z0-9áéíóúñü ]+?)(?=\s+(?:{stops})|[,.;:!?\n]|$)"
        match = re.search(explicit_pattern, lower)
        if match:
            candidate = match.group(1).strip()
            flavors_re = r"chocolate|vainilla|manjar|l[uú]cuma|frutilla|fresa|naranja|lim[oó]n|coco|red\s+velvet"
            candidate = re.sub(rf"\s+de\s+(?:{flavors_re}|tres\s+leches).*$", "", candidate).strip()
            if candidate and candidate not in ("torta", "pastel", "queque"):
                return candidate.title()

        # 2. Eventos u ocasiones conocidas ("boda", "cumpleaños", "aniversario", "bautizo", etc.)
        for keywords, canonical_event in EVENT_THEMES:
            for kw in keywords:
                if kw in lower:
                    return canonical_event

        return None

    def extract_dietary(self, text: str) -> list[str]:
        lower = text.lower()
        restrictions: list[str] = []

        # Subfrases introducidas por "sin ...", "libre de ...", "intolerante(s) a ...", "alérgico(s) a ..."
        intol_re = r"intolerantes?\s+a(?:\s+la|\s+el|\s+los)?|intolerancia\s+a(?:\s+la|\s+el)?"
        alerg_re = r"al[eé]rgicos?\s+a(?:\s+la|\s+el)?|cero|0%?"
        negation_triggers = rf"(?:sin|libre\s+de|{intol_re}|{alerg_re})"
        negated_clauses = " ".join(re.findall(rf"{negation_triggers}\s+([^,.;:!?\n]+)", lower))

        if any(w in lower for w in ("vegana", "vegano", "vegan", "plant based", "100% vegetal")):
            restrictions.append("Vegana")

        lactose_negated = any(w in negated_clauses for w in ("lactosa", "leche", "lácteos", "lacteos"))
        if any(w in lower for w in LACTOSE_FREE_TERMS) or lactose_negated:
            restrictions.append("Sin Lactosa")

        gluten_negated = any(w in negated_clauses for w in ("gluten", "trigo"))
        if any(w in lower for w in GLUTEN_FREE_TERMS) or gluten_negated:
            restrictions.append("Sin Gluten")

        sugar_negated = any(w in negated_clauses for w in ("azúcar", "azucar"))
        if any(w in lower for w in SUGAR_FREE_TERMS) or sugar_negated:
            restrictions.append("Sin Azúcar")

        return restrictions

    def extract_flavors(self, text: str) -> list[str]:
        return self._find_flavors(text) or ["Tradicional"]

    def _find_flavors(self, text: str) -> list[str]:
        lower = text.lower()
        found_with_pos: list[tuple[int, str]] = []
        occupied_spans: list[tuple[int, int]] = []

        for patterns, canonical in FLAVOR_CATALOG:
            best_pos: int | None = None
            best_span: tuple[int, int] | None = None
            for p in patterns:
                m = re.search(rf"\b{re.escape(p)}\b", lower)
                if m:
                    start, end = m.span()
                    if any(s <= start and end <= e for s, e in occupied_spans):
                        continue
                    if best_pos is None or start < best_pos:
                        best_pos = start
                        best_span = (start, end)
            if best_pos is not None and best_span is not None:
                occupied_spans.append(best_span)
                if canonical not in [name for _, name in found_with_pos]:
                    found_with_pos.append((best_pos, canonical))

        found_with_pos.sort(key=lambda item: item[0])
        return [name for _, name in found_with_pos]

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

        size = self._find_tattoo_size(lower)
        style = self._find_tattoo_style(lower)
        part = self._find_body_part(lower)

        entities = {
            "size": size or "No especificado",
            "style": style or "Blanco y Negro",
            "body_part": part or "No especificada",
        }
        return entities, _confidence([size is not None, style is not None, part is not None])

    def _find_tattoo_size(self, lower: str) -> str | None:
        # Soporta enteros, decimales ("5.5 cm", "5,5 cm") y dimensiones 2D ("15x10 cm", "15 por 10 cm")
        dim_pattern = r"\d+(?:[.,]\d+)?(?:\s*(?:x|×|\*|por)\s*\d+(?:[.,]\d+)?)?"
        unit_pattern = r"cm|centimetros|centímetros|mm|milimetros|milímetros"
        size_match = re.search(rf"\b({dim_pattern})\s*({unit_pattern})\b", lower)
        if size_match:
            raw_dim = size_match.group(1).replace(",", ".")
            raw_dim = re.sub(r"\s*(?:x|×|\*|por)\s*", "x", raw_dim)
            raw_unit = size_match.group(2)
            unit = "mm" if raw_unit.startswith("m") else "cm"
            return f"{raw_dim} {unit}"

        if any(w in lower for w in ("pequeño", "pequeno", "chico", "mini", "discreto")):
            return "Pequeño (~5 cm)"
        if any(w in lower for w in ("manga completa", "brazo completo", "espalda completa")):
            return "Grande (~30 cm)"
        if any(w in lower for w in ("media manga",)):
            return "Mediano (~18 cm)"
        return None

    def _find_tattoo_style(self, lower: str) -> str | None:
        matched_styles: list[str] = []
        occupied_spans: list[tuple[int, int]] = []

        for patterns, canonical in TATTOO_ART_STYLES:
            for p in patterns:
                m = re.search(rf"\b{re.escape(p)}\b", lower)
                if m:
                    start, end = m.span()
                    if any(s <= start and end <= e for s, e in occupied_spans):
                        continue
                    occupied_spans.append((start, end))
                    if canonical not in matched_styles:
                        matched_styles.append(canonical)
                    break

        color_words = ("a color", "full color", "colorido", "en color", "colores")
        has_color = any(w in lower for w in color_words) or ("color" in lower and "sin color" not in lower)
        bw_words = ("blanco y negro", "black and grey", "black & grey", "escala de grises", "en negro")
        has_bw = any(w in lower for w in bw_words)
        has_shading = any(w in lower for w in ("sombreado", "sombras", "sombra"))

        if not matched_styles:
            if has_bw or has_shading:
                return "Blanco y Negro"
            if has_color:
                return "A color"
            return None

        if has_color and "Acuarela" not in matched_styles:
            matched_styles.append("A color")
        elif has_bw and "Blackwork" not in matched_styles:
            matched_styles.append("Blanco y Negro")
        elif has_shading and "Sombreado" not in matched_styles:
            matched_styles.append("Sombreado")

        return " / ".join(matched_styles)

    def _find_body_part(self, lower: str) -> str | None:
        for patterns, canonical in BODY_PARTS_CATALOG:
            for p in patterns:
                if re.search(rf"\b{re.escape(p.strip())}\b", lower):
                    return canonical
        return None

    def _find_tattoo_motif(self, lower: str) -> str | None:
        for patterns, motif_en in TATTOO_MOTIFS_EN:
            for p in patterns:
                if re.search(rf"\b{re.escape(p)}\b", lower):
                    return motif_en
        return None

    def build_search_query(self, domain: str, text: str, entities: dict[str, Any]) -> str:
        """Construye una consulta específica en inglés para recuperar referencias variadas en Openverse."""
        terms: list[str] = []
        lower = text.lower()

        if domain == "tattoo":
            motif = self._find_tattoo_motif(lower)
            if motif:
                terms.append(motif)

            raw_style = str(entities.get("style") or "")
            style_parts = [p.strip() for p in raw_style.split("/") if p.strip()]
            for part in style_parts:
                en_style = TATTOO_STYLE_EN.get(part)
                if en_style and en_style not in terms:
                    terms.append(en_style)
                    if len(terms) >= 2:
                        break

            if len(terms) < 2:
                body_part = str(entities.get("body_part") or "")
                en_part = TATTOO_BODY_PART_EN.get(body_part)
                if en_part and en_part not in terms:
                    terms.append(en_part)

            return " ".join(terms[:2]) or "blackwork"

        theme = str(entities.get("theme") or "").strip()
        if theme and theme.lower() != "personalizada":
            terms.append(CAKE_THEME_EN.get(theme.lower(), theme.lower()))
        elif any(w in lower for w in ("niño", "niños", "niña", "niñas", "infantil")):
            terms.append("kids birthday")

        flavors = entities.get("flavors") or []
        if isinstance(flavors, list):
            for flavor in flavors:
                if flavor and flavor != "Tradicional":
                    en_flavor = CAKE_FLAVOR_EN.get(str(flavor), str(flavor).lower())
                    if en_flavor not in terms:
                        terms.append(en_flavor)
                    if len(terms) >= 2:
                        break

        if not terms:
            restrictions = entities.get("dietary_restrictions") or []
            if "Vegana" in restrictions:
                terms.append("vegan")
            elif "Sin Gluten" in restrictions:
                terms.append("gluten free")
            elif "Sin Azúcar" in restrictions:
                terms.append("sugar free")

        return " ".join(terms[:2]) or "chocolate"

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
