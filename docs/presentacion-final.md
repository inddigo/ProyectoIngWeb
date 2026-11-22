# Cotiza — guion de presentación y defensa final

Estado: borrador para ensayar con la versión local. Sustituir la evidencia pendiente por resultados reales antes de la presentación final.

## 1. Problema y alcance (1 minuto)

Los profesionales reciben encargos ambiguos en mensajes y pierden tiempo aclarando datos y calculando precios. Cotiza transforma ese mensaje en un pedido revisable, reúne referencias con procedencia y permite cotizar según materiales, tiempo y costos fijos. Encargos generales sirven a carpintería, diseño, eventos y otros servicios; pastelería y tatuajes conservan campos específicos.

Mostrar un encargo de dos repisas de madera. Aclarar que pagos, chat, audio y competencia entre profesionales no forman parte de la versión.

## 2. Flujo e integración (2 minutos)

Mostrar texto libre, atributos extraídos, confianza y corrección antes de confirmar. Seguir la solicitud entre Angular/Ionic, NestJS, FastAPI y PostgreSQL. Mostrar referencias con autor, licencia y origen, sin dar una miniatura por autorización comercial. Consultar el pedido guardado y mostrar que otro cliente no puede acceder.

Abrir [arquitectura.md](arquitectura.md). Explicar por qué Python procesa texto y referencias y NestJS controla identidad, estados y persistencia. La calculadora adaptativa vive en NestJS junto al historial y no requiere un proveedor externo de IA.

## 3. Adaptación verificable (2 minutos)

Mostrar perfil profesional, horas y costos actuales. Consultar la base sin historial y después la recomendación. Explicar con un caso preparado que tiene tres cotizaciones aceptadas comparables, identificadas como demostración.

Ejemplo: materiales $4.000 + mano de obra $6.000 + fijos $2.000 = $12.000. Recargo base 30%: $15.600. Tres aceptaciones comparables con recargo mediano de 50% producen un peso de 15%, recargo recomendado 33% y total $15.960. Mostrar motivos, falta de referencias si corresponde y edición del precio final. No afirmar que es el precio óptimo.

Mostrar que sin autorización o sin historial suficiente se conserva la base, y que cambiar los costos invalida la sugerencia. Enviar la cotización y aceptar o rechazar desde el cliente.

## 4. Calidad, evaluación y riesgos (2 minutos)

Ejecutar `scripts/evaluate-final.cjs`: ocho escenarios sintéticos, base frente a adaptación y limitaciones. Presentar por separado las observaciones reales de usuarios cuando existan; mientras estén pendientes, no inventar ahorro de tiempo, satisfacción ni número de participantes.

Mostrar validación anidada de costos, autorización por token, límites, pruebas de propiedad y transición condicional de estados. Explicar el riesgo de perpetuar precios históricos y por qué el ajuste está acotado y sujeto a revisión humana. Mostrar consentimiento, exportación de datos y eliminación con contraseña en una cuenta de prueba propia.

## 5. Operación y degradación (2 minutos)

Mostrar `/health`, `/health/metrics`, registros correlacionados y diagnóstico de Openverse. Demostrar una caída controlada de Python únicamente en el stack local y la entrada manual de datos. Restaurar el servicio y comprobar salud. Mostrar el informe de rollback local sobre migración aditiva.

Para una defensa en staging, ejecutar antes el pipeline real de la revisión final y la recuperación real de Openverse. La captura de un pipeline EP2 no acredita los cambios locales. No usar una fuente sintética como prueba de Internet.

## 6. Multiplataforma y cierre (1 minuto)

Mostrar navegador, PWA instalada y Android ejecutando el flujo. El build y el test instrumentado preparados requieren todavía ejecución en SDK/dispositivo. Mostrar accesibilidad de teclado y conectividad. Registrar las limitaciones y los compromisos pendientes con claridad.

## Preguntas para la defensa individual

- ¿Qué validaciones se hacen en Angular y cuáles vuelven a comprobarse en NestJS?
- ¿Cómo impide la aplicación acceder al pedido de otro cliente o recomendar usando el historial de otro profesional?
- ¿Por qué la tasa de aceptación no provoca descuentos automáticos?
- ¿Cómo se conserva procedencia, licencia y fecha de las referencias? ¿Qué pasa si Openverse no responde?
- ¿Qué cambia el modelo de usuario? ¿Cómo se retira su uso?
- ¿Qué se guarda al recomendar y cómo se impide asociar otro costeo?
- ¿Qué significa recargo sobre costos y en qué difiere de un margen sobre venta?
- ¿Qué prueba exactamente el rollback y qué no cubre?
- ¿Qué pasos bloquean el despliegue? ¿Cómo se sabe qué revisión está publicada?
- ¿Qué hizo cada integrante y dónde está su evidencia real?

Cada integrante debe localizar y explicar su implementación y el flujo general. No repartir autoría artificialmente ni memorizar respuestas sin comprender el código.
