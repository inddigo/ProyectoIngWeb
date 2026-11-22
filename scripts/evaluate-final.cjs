/* Evaluación determinista del motor compilado; no consulta cuentas ni servicios externos. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { recommend } = require('../backend-nestjs/dist/quotes/recommendation.engine');
const dataset = require('../docs/evaluation/final-cases.json');

const cases = dataset.cases.map(test => {
  const input = {
    domain: test.domain, attributes: test.attributes,
    costs: { items: [], laborCost: test.cost, fixedCosts: 0, profitMargin: 30 },
    history: test.history.map(([totalCost, price]) => ({ domain: test.domain, attributes: test.attributes, totalCost, price, status: 'ACCEPTED_BY_CLIENT' })),
    useHistory: true, mode: 'adaptive', referenceCount: 0,
  };
  const adaptive = recommend(input);
  const baseline = recommend({ ...input, mode: 'baseline' });
  if (adaptive.suggestedTotal < test.cost || Math.abs(adaptive.appliedMargin - 30) > 15 || baseline.adapted) throw new Error('Se incumple una protección del motor');
  return { id: test.id, targetPrice: test.targetPrice, baseline: baseline.suggestedTotal, adaptive: adaptive.suggestedTotal, adapted: adaptive.adapted, baselineAbsoluteError: Math.abs(baseline.suggestedTotal - test.targetPrice), adaptiveAbsoluteError: Math.abs(adaptive.suggestedTotal - test.targetPrice) };
});
const mean = key => cases.reduce((sum, row) => sum + row[key], 0) / cases.length;
const result = {
  dataset: dataset.dataset, dataType: 'synthetic', generatedAt: new Date().toISOString(),
  engineVersion: 'cost-history-v1',
  sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname, '../backend-nestjs/src/quotes/recommendation.engine.ts'))).digest('hex'),
  caseCount: cases.length, adaptedCases: cases.filter(c => c.adapted).length,
  baselineMaeClp: mean('baselineAbsoluteError'), adaptiveMaeClp: mean('adaptiveAbsoluteError'),
  cases,
  limitations: ['Escenarios sintéticos pequeños, seleccionados para comprobar el comportamiento de las reglas.', 'No demuestran utilidad, aceptación ni reducción de tiempo con personas reales.', 'La mediana histórica no representa un precio óptimo de mercado.'],
};
const output = process.argv[2];
if (output) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({ cases: result.caseCount, baselineMaeClp: result.baselineMaeClp, adaptiveMaeClp: result.adaptiveMaeClp, dataType: result.dataType }));
