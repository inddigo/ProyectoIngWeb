import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.ingweb.cotiza',
  appName: 'Cotiza',
  // Salida de `ng build --configuration android`
  webDir: 'dist/frontend/browser',
  android: {
    // Permite llamar al backend local por HTTP durante el desarrollo (10.0.2.2).
    // En staging/producción se debe usar HTTPS y desactivar esta opción.
    allowMixedContent: true,
  },
  server: {
    androidScheme: 'http',
    cleartext: true,
  },
};

export default config;
