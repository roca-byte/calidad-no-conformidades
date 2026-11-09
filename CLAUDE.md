# CLAUDE.md — Registro de No Conformidades

App individual (sin cuenta ni servidor, MIT) de la suite QualityOS: el registro de NC se carga
todos los días y se entrega por mes. Es independiente de QualityOS (que tiene su propio módulo
de NC con código distinto); solo comparten el formato del respaldo y el pegado de desvíos.

## Reglas
- Scripts clásicos sin build, español rioplatense (voseo), comentarios que explican el porqué.
- Reglas puras en `js/reglas.js` (con pruebas); `js/app.js` solo pantalla.
- **Cada cambio en archivos de la app: subir `V` en `sw.js`.** Archivo nuevo → sumarlo a `FILES`.
- Nada de datos ni marca del empleador del usuario (nombre, logo, clientes, lotes, códigos).
- A quien ya la usa no le puede cambiar nada sin aviso: tipos de desvío de agroquímicos si ya
  había NC con ellos, litros y pallets como unidades por defecto.

## Pruebas
```
. ~/.nvm/nvm.sh; export NODE_PATH=$(npm root -g)
node --test tests/
node tests/e2e.js [carpeta]
```

## Guía y demo
- `docs/GUIA.md` con capturas de `docs/img/`. Si cambia algo visible: `node tools/demo.js`
  (capturas y GIF) y `node tools/video.js` (video), con los datos inventados de
  `tools/ejemplo.js`, y revisar que la guía siga diciendo lo que la app hace.
