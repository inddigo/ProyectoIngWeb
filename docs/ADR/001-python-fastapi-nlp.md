# ADR 001: Elección de Python (FastAPI) para el procesamiento de Lenguaje Natural (NLP)

## Estado
Aceptado

## Contexto
El proyecto requiere extraer entidades (porciones, sabor, temática, dieta) a partir de pedidos de usuarios escritos en texto libre (lenguaje natural).
Si bien el orquestador principal está construido con Node.js (NestJS), necesitamos decidir qué tecnología utilizar para el módulo NLP.

## Alternativas consideradas
1. **Librerías NLP en Node.js (Natural, NLP.js)**: Integradas directamente en NestJS.
2. **Servicio especializado en Python con FastAPI y spaCy/Transformers**: Microservicio externo a NestJS.
3. **API en la Nube (OpenAI, DialogFlow)**: Servicio de terceros gestionado.

## Decisión
Se decidió implementar un **Microservicio en Python utilizando FastAPI y spaCy** (Opción 2).

## Justificación
1. **Ecosistema**: Python es el líder indiscutible en procesamiento de lenguaje natural e inteligencia artificial. Herramientas maduras como `spaCy`, `NLTK`, `HuggingFace Transformers` no tienen un equivalente nativo de igual potencia en Node.js.
2. **Rendimiento y Desacoplamiento**: Cargar un modelo estadístico de lenguaje pesado bloquea o penaliza el loop de eventos (event loop) de Node.js. Aislar el trabajo de CPU/Memoria intensa en un worker/servicio de Python garantiza que la API Gateway de NestJS se mantenga rápida y responsiva para otras transacciones.
3. **Escalabilidad**: Al ser un contenedor docker aislado (FastAPI), si los algoritmos NLP crecen y requieren más poder de cómputo, se puede escalar de manera independiente al backend transaccional.

## Consecuencias
- **Positivas**: Mayor flexibilidad para cambiar algoritmos de IA, mejor rendimiento general del sistema, separación de dominios.
- **Negativas**: Añade complejidad a la infraestructura (hay que orquestar dos servicios backend, configurar Terraform para ambos, y gestionar una nueva pila tecnológica en el CI/CD).
