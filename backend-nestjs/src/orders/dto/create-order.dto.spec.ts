import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';

describe('Atributos por rubro', () => {
  it('rechaza imágenes sin HTTPS o con credenciales dentro de la URL', async () => {
    for (const imageUrl of [
      'http://example.org/image.jpg',
      'https://user:password@example.org/image.jpg',
    ]) {
      const dto = plainToInstance(CreateOrderDto, {
        rawText: 'Un encargo personalizado',
        domain: 'general',
        attributes: { service_type: 'Diseño' },
        imageUrl,
      });
      expect((await validate(dto)).map((e) => e.property)).toContain(
        'imageUrl',
      );
    }
  });
  const errors = async (domain: string, attributes: unknown) =>
    (
      await validate(
        plainToInstance(CreateOrderDto, {
          rawText: 'Un encargo personalizado',
          domain,
          attributes,
        }),
      )
    ).map((e) => e.property);

  it('acepta un encargo general editable sin datos de pastelería', async () => {
    expect(
      await errors('general', {
        service_type: 'Carpintería',
        quantity: 2,
        materials: 'madera',
        deadline: '',
        delivery: 'retiro',
      }),
    ).toEqual([]);
  });
  it.each([
    undefined,
    {},
    { service_type: 'Diseño', quantity: -1 },
    { service_type: 'Diseño', quantity: 1.5 },
    { service_type: 'Diseño', servings: 20 },
  ])('rechaza atributos generales inválidos: %j', async (attrs) => {
    expect(await errors('general', attrs)).toContain('attributes');
  });
  it('limita el tamaño de campos y listas anidadas', async () => {
    expect(await errors('cake', { theme: 'x'.repeat(201) })).toContain(
      'attributes',
    );
    expect(
      await errors('cake', { flavors: Array(21).fill('Chocolate') }),
    ).toContain('attributes');
  });
});
