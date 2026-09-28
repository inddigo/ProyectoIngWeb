# Frontend Angular + Ionic + Capacitor

Ver el [README principal](../README.md).

```bash
npm ci
npm start              # http://localhost:4200 (API en http://localhost:3000)
npm run lint
npm run test:ci        # requiere Chrome/Chromium (CHROME_BIN)
npm run cap:sync       # build Android + sincronización Capacitor
```

Estructura: `src/app/core` (modelos, servicios, guards, interceptores), `src/app/shared`
(utilidades puras: calculadora de costos, atributos), `src/app/features` (páginas con carga diferida).
