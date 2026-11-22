# Evaluación exploratoria con usuarios

## Objetivo y estado

Comparar una cotización manual con el flujo asistido, sin afirmar de antemano que reduce el tiempo. **Todavía no hay observaciones de personas**. La plantilla `user-study.csv` está vacía y el informe lo registra como pendiente.

## Participación y datos

Invitar, de forma voluntaria, a personas que hagan trabajos por encargo; como exploración inicial se sugieren cinco o más participantes. Explicar que se evalúa la aplicación y no su desempeño. No registrar nombres, correos, voz, información financiera real ni grabaciones. Identificar cada participación como P01, P02, etc. Una persona puede retirarse y pedir eliminar sus observaciones antes de publicar el agregado.

Usar cuentas locales y encargos ficticios. Si se preparan cotizaciones previas para activar el motor, identificarlas como historial sintético; no atribuirlas a la actividad real del participante.

## Tareas

1. Preparar dos encargos de dificultad comparable: por ejemplo, dos repisas de madera con entrega y una pieza de diseño digital con alcance delimitado. Entregar costos y horas completos, para que la comparación no dependa de inventar materiales.
2. Condición `baseline`: completar atributos manualmente y cotizar con los mismos costos, sin consultar una recomendación histórica.
3. Condición `adaptive`: revisar la estructuración NLP, corregir atributos, aplicar el perfil, consultar y explicar la recomendación; permitir que el participante la cambie o descarte.
4. Alternar el orden entre participantes y rotar los encargos para reducir aprendizaje. Registrar el orden y cualquier incidencia en notas anónimas aparte.
5. Cronometrar desde que se presenta el encargo hasta que envía una cotización correcta. Registrar éxito, correcciones y problemas de conectividad. No excluir silenciosamente los intentos fallidos.
6. Preguntar utilidad percibida (1–5) y comprensión de la sugerencia (1–5), además de una observación libre sin datos personales. Pedir que explique el origen del precio con sus palabras.

En la plantilla, `task` acepta `carpinteria`, `diseno` o `eventos`; `condition`, `baseline` o `adaptive`; `success`, 0 o 1. El tiempo se expresa en segundos. `corrections` cuenta cambios de campos necesarios para completar el pedido. No rellenar filas con valores inventados.

## Análisis reproducible

```bash
python scripts/analyze-user-study.py docs/evaluation/user-study.csv --output docs/evidence/final-local/user-study.json
```

El script valida rangos, rechaza identificadores personales y duplicados, agrega tiempos, éxito, correcciones y valoraciones por condición. La reducción temporal se calcula solo para participantes con ambas condiciones. Sin observaciones devuelve valores `null` y estado pendiente.

Presentar tamaño de muestra, orden de tareas, fallos, limitaciones y comentarios relevantes. Es una evaluación exploratoria; no permite afirmar causalidad ni generalizar al conjunto de profesionales. Las métricas del conjunto sintético del motor se presentan por separado.
