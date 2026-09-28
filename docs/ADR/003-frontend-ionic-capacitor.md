# ADR 003: Angular + Ionic standalone + Capacitor para web, PWA y Android

## Estado
Aceptado

## Contexto
La aplicación debe ejecutarse en navegador, como PWA y como app Android desde una base de
código común, con navegación e interacción adecuadas a cada dispositivo.

## Decisión
- **Angular 20** con componentes standalone, Signals para el estado, formularios reactivos,
  guards funcionales e interceptores (`auth` y `error`).
- **Ionic 8** (componentes standalone `@ionic/angular/standalone`): toolbars, segmentos,
  tarjetas, modales, refresher, toasts y alertas. El layout usa `ion-grid` con breakpoints
  (móvil: una columna; escritorio: columnas paralelas; la calculadora es pantalla completa en
  móvil y diálogo en escritorio).
- **Capacitor 8** para Android, con el plugin `@capacitor/network` para mostrar el estado de
  conectividad (requisito de uso en terreno con conexión inestable).
- **Service Worker** de Angular para la PWA.
- La URL de la API se define por ambiente (`environment*.ts`): en web/PWA es el mismo origen
  (nginx hace proxy), en Android apunta al host del emulador o a staging.

## Consecuencias
- (+) Un solo código para las tres plataformas.
- (−) El bundle inicial crece (~1,1 MB sin comprimir, ~220 kB transferidos) por Ionic.
