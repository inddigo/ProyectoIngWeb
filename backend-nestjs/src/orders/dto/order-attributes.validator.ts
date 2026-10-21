import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Domain } from '../../common/constants/domains';

const FIELDS: Record<Domain, string[]> = {
  general: ['service_type', 'quantity', 'materials', 'deadline', 'delivery'],
  cake: ['servings', 'theme', 'flavors', 'dietary_restrictions'],
  tattoo: ['size', 'style', 'body_part'],
};

@ValidatorConstraint({ name: 'orderAttributes', async: false })
export class OrderAttributesValidator implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const { domain } = args.object as { domain: Domain };
    if (
      !FIELDS[domain] ||
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value)
    )
      return false;
    const attrs = value as Record<string, unknown>;
    if (
      domain === 'general' &&
      (typeof attrs.service_type !== 'string' ||
        attrs.service_type.trim().length < 2)
    )
      return false;
    return Object.entries(attrs).every(([key, item]) => {
      if (!FIELDS[domain].includes(key)) return false;
      if (['servings', 'quantity'].includes(key))
        return (
          Number.isSafeInteger(item) &&
          Number(item) >= 1 &&
          Number(item) <= 10000
        );
      if (['flavors', 'dietary_restrictions'].includes(key))
        return (
          Array.isArray(item) &&
          item.length <= 20 &&
          item.every(
            (entry) => typeof entry === 'string' && entry.length <= 200,
          )
        );
      return typeof item === 'string' && item.length <= 200;
    });
  }
  defaultMessage(): string {
    return 'Atributos inválidos: revisa los campos del rubro, los textos (máximo 200 caracteres) y las cantidades (enteros entre 1 y 10000). En encargos generales indica el tipo de trabajo.';
  }
}
