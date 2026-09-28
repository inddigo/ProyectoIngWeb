# Definición del proyecto

## Problema
Los profesionales que trabajan con pedidos personalizados (pastelerías, tatuadores,
carpinteros, organizadores de eventos, freelancers) reciben solicitudes por WhatsApp o
redes sociales como párrafos largos o audios ambiguos: *"quiero una torta vegana para
20 personas con temática de Batman"*. Descifrar cada mensaje, pedir los datos faltantes,
buscar referencias visuales y calcular un precio justo consume horas y genera errores
de cotización (cobrar bajo el costo real o perder clientes por demoras).

## Usuarios objetivo
| Usuario | Necesidad |
|---|---|
| **Cliente final** | Describir lo que quiere en lenguaje natural, sin formularios rígidos, y seguir el estado de su pedido. |
| **Profesional independiente** (pastelero, tatuador, …) | Recibir pedidos estandarizados, cotizar según sus costos reales y registrar la decisión del cliente. |

## Objetivos
1. **Estandarizar** solicitudes caóticas en un formulario estructurado mediante NLP.
2. **Automatizar** la búsqueda de referencias visuales en la Web.
3. **Profesionalizar** la cotización con una calculadora de costos (insumos, mano de obra, costos fijos y margen).
4. **Mejorar la experiencia** del cliente con un portal de seguimiento y decisión (aceptar/rechazar).

## Alcance
**Incluido:** portal de cliente multiplataforma (web, PWA, Android), extracción de atributos
por rubro (pastelería y tatuajes en esta versión), referencias web, panel del profesional con
calculadora de costos, ciclo de vida del pedido, autenticación por roles.

**Fuera de alcance (por ahora):** pagos en línea, chat en tiempo real, entrada por audio,
múltiples profesionales compitiendo por un pedido, facturación.

## Funcionalidades principales
1. Ingreso de pedido en texto libre + imagen de referencia opcional.
2. Estructuración automática por rubro con puntaje de confianza; el cliente corrige antes de confirmar.
3. Referencias visuales obtenidas de la Web.
4. Registro/inicio de sesión con roles `CLIENT` y `BAKER` (profesional).
5. Panel del profesional: filtros por estado, calculadora de costos, estimación por reglas y envío de cotización.
6. Panel del cliente: seguimiento de pedidos, aceptación o rechazo de cotizaciones.

## Fuente de información web
**Openverse API** (`https://api.openverse.org/v1/images/`), catálogo abierto de imágenes con
licencia Creative Commons (Flickr, Wikimedia, etc.). No requiere API key; se consulta con la
temática/estilo extraído + el rubro, con caché en memoria y referencias de respaldo si la API
no responde. Cada referencia conserva título, fuente y licencia.

## Capacidad adaptativa / inteligente
El servicio Python (FastAPI + spaCy + reglas) **adapta el formulario al rubro** detectado
y al contenido del mensaje:
- Extrae entidades distintas por rubro (pastelería: porciones, temática, sabores, restricciones;
  tatuaje: tamaño, estilo, zona del cuerpo).
- Calcula una **confianza** según cuántos campos obligatorios se detectaron explícitamente; con
  confianza baja la interfaz pide al cliente completar los datos (decisión verificable).
- En el panel del profesional, una **estimación por reglas** (porciones × precio base ×
  multiplicador de complejidad de la temática + recargos por restricciones) sirve de referencia
  frente al precio calculado con sus costos.

Evolución prevista (EP2/EF): modelo de usuario del profesional (precios históricos, tiempos) para
recomendar precio y ajustar reglas según cotizaciones aceptadas/rechazadas.
