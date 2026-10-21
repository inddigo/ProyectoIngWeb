import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.ingweb.cotiza',
  appName: 'Cotiza',
  // Salida de `ng build --configuration android`
  webDir: 'dist/frontend/browser',
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
