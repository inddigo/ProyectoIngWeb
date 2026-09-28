import { attributeEntries, formatAttribute, parseAttribute } from './attributes';

describe('attributes', () => {
  it('omite confidence_score', () => {
    expect(attributeEntries({ servings: 10, confidence_score: 0.9 }).map(([k]) => k)).toEqual(['servings']);
  });

  it('formatea listas y vacíos', () => {
    expect(formatAttribute(['Chocolate', 'Vainilla'])).toBe('Chocolate, Vainilla');
    expect(formatAttribute([])).toBe('—');
  });

  it('respeta el tipo original al editar', () => {
    expect(parseAttribute(['a'], 'Vegana, Sin Gluten ')).toEqual(['Vegana', 'Sin Gluten']);
    expect(parseAttribute(10, '25')).toBe(25);
    expect(parseAttribute(10, 'abc')).toBe(10);
    expect(parseAttribute('Boda', ' Batman ')).toBe('Batman');
  });
});
