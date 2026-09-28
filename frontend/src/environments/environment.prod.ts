// Producción web/PWA: nginx sirve el frontend y hace proxy de /api, /auth y
// /health hacia NestJS, por lo que las llamadas son al mismo origen.
export const environment = {
  production: true,
  apiUrl: '',
};
