# ADR-007: cotización adaptada al historial propio

## Estado

Implementada, validada en CI y desplegada en staging (Render + PostgreSQL Neon con la migración aditiva `20261022000000_final_adaptation`).

## Problema

Una regla fija por porción o centímetro no sirve para todos los trabajos personalizados. Tampoco hay evidencia para recomendar precios de mercado a partir de fotografías. La calculadora necesita partir de los costos actuales y dar al profesional una referencia que pueda comprender y corregir.

## Decisión

Se conserva la estructuración por rubro en FastAPI y se implementa en NestJS el motor determinista `cost-history-v1`, próximo a los datos de cotizaciones. No usa modelos externos ni envía datos personales para calcular precios.

El perfil del profesional guarda valor hora, costos fijos, recargo y autorización voluntaria para utilizar historial. Las nuevas cotizaciones registran al profesional autenticado. Las cotizaciones de EP2 permanecen sin atribución: no se asigna retroactivamente su autoría.

El motor recibe materiales, mano de obra y costos fijos actuales. Recalcula el costo en el servidor. La línea base es `costo × (1 + recargo/100)`. Los pesos se redondean hacia arriba, después de normalizar centavos para evitar errores de coma flotante.

Con autorización, se consultan las últimas 50 decisiones del profesional, del mismo rubro, durante 180 días. Se comparan categoría y materiales en encargos generales, estilo en tatuajes, y temática y restricciones en pastelería. La coincidencia ignora tildes y mayúsculas, pero no interpreta sinónimos.

Se requieren tres trabajos aceptados con costo positivo y recargo histórico entre 0 y 500%. Se calcula la mediana del recargo efectivo `(precio/costo - 1) × 100`. Su peso es `min(0.5, aceptados/20)`. El cambio del recargo actual se limita a 15 puntos y el precio sugerido nunca queda bajo el costo actual. Los rechazos informan la tasa de aceptación; no provocan descuentos automáticos. Con historial insuficiente o desactivado se conserva la base.

Las referencias web persistidas aportan contexto: cuando faltan, se pide confirmar el diseño. Su cantidad no aumenta ni reduce el precio. No se infiere esfuerzo o complejidad a partir de la disponibilidad de imágenes.

Cada recomendación conserva versión, entradas, resultado, explicación y propietario. Al enviar una cotización vinculada se comprueba que pertenecía al mismo pedido y profesional y que los costos no cambiaron. El profesional puede ignorar la sugerencia o escribir otro precio.

## Privacidad y controles

- Activación voluntaria y desactivación del uso del historial.
- Desvinculación definitiva del historial propio: desactiva la función, elimina recomendaciones y retira la relación de autor de las cotizaciones previas. Los pedidos del cliente se conservan.
- Exportación de datos de la cuenta autenticada, actualización del nombre y eliminación tras comprobar nuevamente la contraseña.
- La eliminación de una cuenta borra sus pedidos como cliente, referencias y cotizaciones asociadas, además de su perfil y recomendaciones. Si era profesional, las cotizaciones enviadas a otros clientes permanecen sin relación con esa cuenta.
- El JWT deja de servir después de eliminar la cuenta porque cada solicitud comprueba al usuario en PostgreSQL.
- No se utilizan nombre, correo ni características personales del cliente para recomendar precios.

## Consecuencias y límites

Es un motor de reglas transparente, no un modelo entrenado ni una predicción del precio óptimo. El historial puede perpetuar decisiones deficientes del profesional; la mediana, el ajuste acotado y la revisión humana reducen ese riesgo sin eliminarlo. No se recomienda interpretar una aceptación como prueba de justicia o rentabilidad.

La infraestructura conserva el alcance de un único negocio con profesionales autorizados; no implementa un mercado de profesionales independientes aislados entre sí. Los profesionales ven los pedidos del negocio, pero el historial de recomendación se consulta por autor.

Las pruebas sintéticas comprueban reglas y protecciones. La utilidad con personas requiere observaciones reales y no se acredita con esos casos. La migración es aditiva y admite el rollback del backend a EP2; una migración destructiva necesitaría otra estrategia y respaldo.
