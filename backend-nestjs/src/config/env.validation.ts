/**
 * Valida variables de entorno al iniciar. En producción se exige un
 * JWT_SECRET real; en desarrollo se usa uno local para no bloquear.
 */
export function validateEnv(config: Record<string, unknown>) {
  const env = { ...config };
  const isProd = env.NODE_ENV === 'production';

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL es obligatoria');
  }
  if (!env.JWT_SECRET) {
    if (isProd) {
      throw new Error('JWT_SECRET es obligatoria en producción');
    }
    env.JWT_SECRET = 'dev-only-insecure-secret';
  } else if (isProd && String(env.JWT_SECRET).length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
  return env;
}
