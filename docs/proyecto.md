# Definición del proyecto y especificación EP2

## 1. Problema y contexto
Los profesionales que trabajan con pedidos personalizados (pastelerías, tatuadores,
carpinteros, organizadores de eventos, freelancers) reciben solicitudes por WhatsApp o
redes sociales como párrafos largos o audios ambiguos: *"quiero una torta vegana para
20 personas con temática de Batman"*. Descifrar cada mensaje, pedir los datos faltantes,
buscar referencias visuales y calcular un precio justo consume horas y genera errores
de cotización (cobrar bajo el costo real o perder clientes por demoras).

## 2. Usuarios objetivo
| Usuario | Necesidad |
|---|---|
| **Cliente final (`CLIENT`)** | Describir lo que quiere en lenguaje natural, sin formularios rígidos, visualizar referencias reales y seguir el estado de su pedido. |
| **Profesional independiente (`BAKER`)** | Recibir pedidos estandarizados con referencias visuales limpias y con licencia abierta, cotizar según sus costos reales y registrar la decisión del cliente. |

## 3. Objetivos y alcance
1. **Estandarizar** solicitudes caóticas en un formulario estructurado mediante NLP (`spaCy` + reglas por rubro).
2. **Automatizar** la obtención, validación, limpieza, normalización y deduplicación de referencias visuales desde la Web.
3. **Profesionalizar** la cotización con una calculadora de costos (insumos, mano de obra, costos fijos y margen) apoyada por estimación basada en reglas.
4. **Mejorar la experiencia** del cliente con un portal multiplataforma (Web, PWA, Android) de seguimiento y decisión (aceptar/rechazar).

**Fuera de alcance:** pagos en línea, chat en tiempo real, entrada por audio, múltiples profesionales compitiendo por un mismo pedido y facturación electrónica.

---

## 4. Continuidad y correcciones incorporadas desde la EP1

Esta trazabilidad registra brechas técnicas detectadas en el repositorio. El equipo debe contrastarla con la retroalimentación docente original, que no se adjuntó a esta revisión.

| Observación / Brecha detectada al cierre de EP1 | Acción técnica implementada en EP2 | Evidencia en el repositorio |
|---|---|---|
| **Caché de referencias web sin expiración ni límite** (`dict` en memoria ilimitado) | Se implementó `CacheEntry` con TTL configurable (`SCRAPER_CACHE_TTL_SECONDS=3600`) y tamaño máximo (`SCRAPER_MAX_CACHE_ENTRIES=128`) con desalojo del más antiguo. | [`service-python/app/services/scraper.py`](../service-python/app/services/scraper.py) |
| **Ausencia de limpieza, normalización y deduplicación formal sobre datos web** | Pipeline determinista: decodificación HTML (`html.unescape`), eliminación de etiquetas/ruido de archivos (`IMG_...`), normalización Unicode `NFKC`, canonización de URLs HTTPS (sin `utm_*`/`fbclid`), estandarización de licencias Creative Commons y deduplicación por URL y título. | [`service-python/app/services/scraper.py`](../service-python/app/services/scraper.py), [`service-python/app/tests/test_scraper.py`](../service-python/app/tests/test_scraper.py) |
| **Persistencia de `web_references` sin metadatos de procedencia ni control de duplicados** | Se extendió el esquema Prisma y se creó la migración `20261018000000_ep2_web_references_metadata` con `source_url`, `license`, `creator`, `query_used`, `retrieved_at`, restricción única `@@unique([orderId, imageUrl])`, índices B-Tree y endpoint de búsqueda `GET /api/v1/orders/web-references`. | [`backend-nestjs/prisma/schema.prisma`](../backend-nestjs/prisma/schema.prisma), [`backend-nestjs/src/orders/orders.service.ts`](../backend-nestjs/src/orders/orders.service.ts) |
| **Comunicación NestJS → FastAPI sin reintentos ni Correlation ID** | Se agregó `retry({ count: 1, delay: 150 })` en `NlpService`, interceptor global `CorrelationLoggingInterceptor` con `AsyncLocalStorage`, propagación de `X-Correlation-Id` y logs estructurados en JSON en ambos servicios. | [`backend-nestjs/src/nlp/nlp.service.ts`](../backend-nestjs/src/nlp/nlp.service.ts), [`service-python/app/main.py`](../service-python/app/main.py) |
| **Visualización incompleta en el panel del cliente** | Se incorporó la galería de referencias web persistidas y sus metadatos de procedencia en `ClientDashboardComponent` y métricas de extracción en `CustomerPortalComponent`. | [`frontend/src/app/features/client-dashboard/client-dashboard.component.ts`](../frontend/src/app/features/client-dashboard/client-dashboard.component.ts) |

---

## 5. Fuente de información web, procedencia y uso responsable

### 5.1. Identificación y justificación
- **Fuente seleccionada:** **Openverse API** (`https://api.openverse.org/v1/images/`), mantenida por WordPress/Automattic como buscador de obras con licencias abiertas Creative Commons y de dominio público (indexando Flickr, Wikimedia Commons, Rawpixel, etc.).
- **Datos obtenidos:** Miniatura/URL de imagen (`thumbnail`/`url`), título de la obra (`title`), proveedor origen (`source`), código y versión de licencia (`license`, `license_version`), autor (`creator`) y URL de aterrizaje (`foreign_landing_url`).
- **Propósito en la solución:** Cuando un cliente solicita una torta personalizada o un tatuaje, el sistema extrae la temática o estilo mediante NLP y recupera automáticamente 4 referencias visuales reales que:
  1. Orientan al cliente al confirmar su pedido.
  2. Se almacenan junto al pedido en PostgreSQL para que el profesional (`BAKER`) comprenda la complejidad visual al cotizar.
  3. Alimentan el repositorio indexado de referencias consultable desde el backend (`GET /api/v1/orders/web-references`).

### 5.2. Método de acceso y estrategia de actualización
- **Método:** API REST JSON mediante cliente asíncrono `httpx.AsyncClient` con `timeout=4.0s` y filtro obligatorio `mature=false`.
- **Frecuencia y estrategia de actualización:** Consulta bajo demanda con **caché en memoria con TTL de 1 hora (`3600s`)** por combinación `dominio:consulta_normalizada` y límite de 128 entradas activas. Al confirmar un pedido, la instantánea de las referencias y su fecha exacta de recuperación (`retrieved_at`) quedan persistidas en PostgreSQL.

### 5.3. Restricciones legales, éticas, `robots.txt` y privacidad
- **Cumplimiento de `robots.txt` y términos de servicio:** En lugar de realizar *scraping* intrusivo sobre HTML de sitios de terceros que lo prohíben en su `robots.txt`, se consume el endpoint oficial de la API pública de Openverse, identificando el cliente con la cabecera `User-Agent: CotizaAcademicBot/1.2 (+https://github.com/inddigo/ProyectoIngWeb; uso academico responsable)`.
- **Derechos de autor y atribución:** Solo se recuperan imágenes bajo licencias abiertas (`CC BY`, `CC BY-SA`, `CC0`, `PDM`). Cada registro conserva y muestra en la interfaz el proveedor, el autor (`creator`), la licencia normalizada y el enlace a la obra original (`source_url`).
- **Privacidad y minimización de datos:** **Nunca se envía el texto crudo del cliente (`raw_text`) ni datos personales a Openverse.** El motor NLP extrae primero únicamente la entidad genérica de temática o estilo (ej. `"Batman cake"` o `"Acuarela tattoo"`) y solo ese término sanitizado se envía a la API externa.

---

## 6. Proceso de recuperación, limpieza, normalización y deduplicación

El pipeline implementado en [`service-python/app/services/scraper.py`](../service-python/app/services/scraper.py) ejecuta 6 etapas secuenciales y automatizadas:

1. **Extracción controlada:** Solicita hasta `RAW_PAGE_SIZE=12` candidatos a Openverse con `mature=false` y `timeout=4.0s`.
2. **Validación:** Verifica que cada registro sea un objeto válido y que su URL de imagen utilice estrictamente protocolo seguro `https://` con dominio válido (`normalize_url`). Los registros con `http://`, esquemas `javascript:` o sin URL se descartan y contabilizan en `invalid_records_dropped`.
3. **Limpieza:** Decodifica entidades HTML (`&amp;` → `&`, `&#39;` → `'`), elimina etiquetas HTML residuales (`<b>`, `<p>`), remueve caracteres de control no imprimibles y limpia nombres de archivo de cámara (`IMG_2045.JPG`, `DSC_0012.PNG`).
4. **Normalización:** Aplica normalización Unicode `NFKC`, colapsa espacios múltiples, canoniza URLs eliminando parámetros de seguimiento (`utm_source`, `utm_medium`, `fbclid`, `gclid`) y estandariza los códigos de licencia en mayúsculas (`CC BY-SA 4.0`, `CC0 1.0`).
5. **Deduplicación en dos capas:**
   - **En Python (`process_raw_results`):** Descarta candidatos con la misma URL canónica o el mismo título normalizado dentro del lote antes de seleccionar las `MAX_RESULTS=4` referencias finales.
   - **En NestJS / PostgreSQL (`OrdersService.create` + Prisma):** Deduplica por `imageUrl` antes de insertar y aplica la restricción única `UNIQUE (order_id, image_url)` en la tabla `web_references`.
6. **Manejo de errores e indisponibilidad (Degradación controlada):**
   - Si Openverse falla (timeout, error HTTP 429/5xx, error de red o lista vacía), `WebReferenceScraper` registra el evento estructurado, incrementa `fallback_count` y retorna una lista vacía de referencias (`fallback_used: true`) sin interrumpir el flujo del usuario.
   - Si el servicio Python completo no responde tras 1 reintento automático (`retry({ count: 1, delay: 150 })`) y timeout de 10 s, NestJS devuelve `fallback: true` para que el cliente complete el formulario manualmente.

---

## 7. Evaluación de la información recuperada

Para evaluar cuantitativamente la calidad de los datos recuperados y del procesamiento NLP se definieron **4 métricas complementarias**, accesibles en tiempo real mediante `GET /api/v1/nlp/metrics` (FastAPI) y `GET /api/v1/orders/nlp-metrics` (NestJS):

| Métrica | Fórmula / Definición | Justificación para el proyecto | Resultado reproducible (Benchmark / Pruebas) |
|---|---|---|---|
| **1. Porcentaje de registros válidos (`valid_records_rate_pct`)** | $\frac{\text{Registros válidos conservados}}{\text{Registros crudos inspeccionados}} \times 100$ | Mide qué proporción de los resultados devueltos por la fuente externa cumple con HTTPS válido, esquema íntegro y ausencia de duplicados. | **100 %** en un lote reproducible de 12 registros válidos y únicos; **40 %** en el lote de estrés con ruido/duplicados inyectados (`test_scraper.py`). |
| **2. Porcentaje de duplicados filtrados (`duplicate_rate_pct`)** | $\frac{\text{Duplicados eliminados}}{\text{Registros crudos inspeccionados}} \times 100$ | Evalúa la efectividad del filtro de deduplicación por URL canónica y título para no mostrar imágenes repetidas al cliente ni al pastelero/tatuador. | Detecta y filtra el **100 %** de duplicados por URL (`utm_*`) y título (`test_process_raw_results_deduplicates_and_filters_invalid`). |
| **3. Tiempo de recuperación (`avg_latency_ms`)** | Latencia promedio de extremo a extremo en `get_references_with_meta` (ms) | Crítico para la experiencia interactiva del cliente al estructurar su pedido: debe mantenerse bajo el umbral de timeout (4000 ms) y ser `< 5 ms` en aciertos de caché. | Medición por ejecución con `latency_ms`; prueba determinista de caché y expiración. No hay medición de staging hasta habilitar el proyecto cloud. |
| **4. Exactitud de extracción NLP (`entity_extraction_accuracy_pct`)** | $\frac{\text{Atributos extraídos correctamente}}{\text{Total de atributos esperados en el benchmark}} \times 100$ | La calidad de la consulta enviada a Openverse depende directamente de extraer bien la temática (`theme`) o estilo (`style`) junto con porciones/tamaño/sabores. | **100 % (21 / 21 campos)** sobre los 6 casos multirubro del conjunto `EVALUATION_BENCHMARK`. |

### Interpretación y limitaciones identificadas
- **Dependencia del idioma en consultas muy específicas:** Openverse tiene mayor cobertura cuando el término de búsqueda combina la temática con la palabra clave en inglés (`cake` o `tattoo`, que el sistema añade automáticamente en `DOMAIN_KEYWORDS`).
- **Caché en memoria por instancia:** En despliegues con múltiples réplicas en Cloud Run, el caché con TTL es local a cada contenedor; si el tráfico escala horizontalmente en el futuro, podría migrarse a Redis sin cambiar el contrato HTTP.

---

## 8. Diseño preliminar de la capacidad adaptativa o inteligente (Módulo 3)

De acuerdo con los requisitos de la EP2 (sección 24.2.8), a continuación se especifica el diseño completo de la capacidad adaptativa que articula la extracción NLP, las referencias web recuperadas y el contexto del usuario:

| Dimensión requerida | Especificación técnica en Cotiza |
|---|---|
| **1. ¿Qué parte del sistema se adapta?** | Se adaptan **dos componentes**: (a) el **Formulario dinámico y nivel de asistencia en el Portal del Cliente**, y (b) el **Motor de recomendación de cotización e insumos en el Panel del Profesional (`BAKER`)**. |
| **2. ¿Quién es el usuario beneficiado?** | El **Cliente final** (recibe un formulario adaptado a su rubro y alertas proactivas cuando su descripción es ambigua) y el **Profesional independiente** (recibe una precarga adaptativa de insumos, mano de obra y precio sugerido calibrado según la complejidad del pedido y su historial). |
| **3. ¿Qué información recuperada desde la Web se utiliza?** | Se utilizan: (a) la disponibilidad y cantidad de referencias válidas encontradas en Openverse (`extraction_meta.valid_count`), (b) la consulta temática normalizada (`query_used`), y (c) las referencias visuales seleccionadas/persistidas (`web_references`), que actúan como indicador de especificidad temática frente a pedidos genéricos. |
| **4. ¿Qué variables de usuario o contexto se consideran?** | 1) **Rubro seleccionado (`domain`):** `cake` vs `tattoo`.<br/>2) **Completitud del mensaje (`confidence_score`):** proporción de atributos obligatorios detectados ($0.30$ a $0.95$).<br/>3) **Atributos extraídos:** porciones/tamaño, temática/estilo, restricciones alimentarias (`Vegana`, `Sin Gluten`, `Sin Lactosa`).<br/>4) **Historial de cotizaciones del profesional (`quotes` y `orders` en PostgreSQL):** tasa de aceptación (`ACCEPTED_BY_CLIENT` vs `REJECTED_BY_CLIENT`) y precio promedio histórico por porción/cm. |
| **5. ¿Qué decisión toma el sistema?** | - **En el Portal del Cliente:** Si `confidence_score < 0.60` o `fallback == true`, activa el modo de **asistencia guiada** destacando los campos inferidos por defecto para que el usuario los revise obligatoriamente antes de confirmar.<br/>- **En el Panel del Profesional:** Selecciona la plantilla de insumos por rubro, escala las cantidades proporcionalmente al tamaño/porciones, aplica multiplicadores de complejidad temática y recargos dietéticos (`estimatePrice`), y ajusta la recomendación según el margen histórico de cotizaciones aceptadas. |
| **6. ¿Qué mecanismo se utiliza?** | **Motor híbrido basado en extracción de entidades con `spaCy` (`es_core_news_md`) + sistema de reglas parametrizadas y heurísticas de calibración histórica** (políticas de decisión transparentes y auditables). |
| **7. ¿Qué resultado es visible y qué control tiene el usuario?** | - **Transparencia:** El cliente ve la insignia de confianza de la IA (`%`) y el origen de cada referencia web; el profesional ve el **desglose completo** (`servingsCost`, `themeMultiplier`, `restrictionsCost`, costo por insumo y margen).<br/>- **Control total del usuario:** El cliente puede **editar cualquier atributo** estructurado antes de confirmar o reiniciar el formulario; el profesional puede **aplicar el precio sugerido**, **consultar la estimación por reglas**, **modificar/agregar/eliminar insumos y márgenes**, o escribir un **precio final manual** antes de enviar la cotización. |
| **8. ¿Qué riesgos de sesgo, privacidad o falta de transparencia existen y cómo se mitigan?** | - **Riesgo de sesgo de precios:** Si el cálculo se basara en una caja negra, podría subvalorar trabajos artesanales complejos (ej. alergias alimentarias o tatuajes a color). *Mitigación:* Fórmulas explícitas con desglose visible y edición libre por el profesional.<br/>- **Riesgo de alucinación o error de NLP:** Un mensaje ambiguo podría asignar 10 porciones por defecto cuando el cliente quería 50. *Mitigación:* Puntaje de confianza visible, alerta amarilla cuando `< 60%` y paso obligatorio de confirmación humana.<br/>- **Privacidad:** Minimización estricta en consultas a Openverse (solo se envían palabras clave de estilo/temática, nunca nombres, teléfonos ni el texto íntegro del cliente). |
| **9. ¿Cómo se evaluará posteriormente la utilidad de la adaptación (Módulo 3)?** | Se evaluará comparando el flujo adaptativo (NLP + precarga de calculadora + estimación por reglas) frente a una **línea base no adaptativa** (ingreso manual desde cero) midiendo:<br/>1) **Tiempo promedio de creación y cotización de un pedido** (reducción esperada $> 50\%$).<br/>2) **Tasa de corrección de campos por el cliente** según nivel de `confidence_score`.<br/>3) **Desviación relativa** entre el precio sugerido por el motor adaptativo y el precio final enviado por el profesional. |


## 9. Correcciones verificadas al cierre técnico

La evaluación distingue `valid_count` (todos los registros únicos válidos del lote) de `returned_count` (hasta cuatro referencias mostradas). Sin observaciones, la tasa de calidad es `null`. No se asigna una licencia a registros que no la informan. Los temas libres permanecen internos; solo términos conocidos de un catálogo se envían a Openverse. Si falla la fuente no se inventan imágenes ni procedencias. La interfaz muestra autor, licencia y enlace original cuando existen.

Estado y demostración: [entrega2.md](entrega2.md).
