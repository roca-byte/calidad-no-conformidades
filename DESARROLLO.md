# Desarrollo — Registro de No Conformidades

Información técnica para quien quiera modificar o publicar la app. Para usarla, ver el
[README](README.md). Nació como réplica local del `registro_nc` de la QualityOS vieja; es la
versión sin cuenta ni servidor. QualityOS va a tener su propio módulo de NC (código distinto).

## Tecnologías

HTML + CSS + JavaScript vanilla, sin build ni dependencias de Node.
Única librería incluida: [SheetJS](https://sheetjs.com/) (`vendor/xlsx.full.min.js`) para el Excel.

## Estructura

```
├── index.html          # Interfaz
├── style.css           # Estilos (incluye impresión y tema)
├── brand.js            # Datos de empresa y codificación del registro
├── manifest.json       # Configuración PWA
├── sw.js               # Service worker (caché offline)
├── js/
│   ├── app.js          # Pantalla: tabla/tarjetas, impresión, Excel, configuración
│   ├── reglas.js       # Reglas puras: meses, indicadores, tipos, desvíos de QualityOS
│   ├── db.js           # Capa de datos (IndexedDB)
│   ├── marca.js        # Empresa y logo configurables (Marca)
│   └── backup.js       # Exportar/importar backup .json
├── vendor/
│   └── xlsx.full.min.js
├── tests/
│   ├── reglas.test.js  # Pruebas de las reglas (Node)
│   └── e2e.js          # Recorrido completo en Chromium (Playwright)
└── IDEAS.md            # Ideas pendientes
```

## Probar en la compu

Al ser estática, alcanza con servirla por HTTP (el service worker no funciona con `file://`):

```bash
# desde la carpeta del proyecto
python3 -m http.server 8000
```

Abrir `http://localhost:8000`.

También se puede publicar en cualquier hosting estático (GitHub Pages, Netlify, etc.).

## Configuración por código

La empresa y el logo se cargan desde la app, en el panel **⚙️ Codificación**. Quedan guardados solo en el dispositivo y se usan en las dos hojas de impresión: si hay logo, se muestra el logo; si no, el nombre de la empresa.

Los valores de `brand.js` quedan como respaldo cuando la configuración está vacía:

```js
const BRAND = {
  empresa: 'Empresa S.A.',
  codigo: 'SGC-RNC-01',
  version: '02',
  area: 'Aseg. Calidad',
  elaboro: '...',
  aprobo: '',
  proceso: '...',
  plazoDias: 5   // días hábiles para el plazo de reproceso automático
};
```

Los tipos de desvío (con su gravedad sugerida) se arman desde la app (**⚙️ Configuración**) y se
guardan en `localStorage['nc_tipos.v1']`. Los ejemplos por rubro están en `EJEMPLOS` de
`js/reglas.js`. La primera vez, si ya hay NC con los tipos de agroquímicos (versiones anteriores),
se arranca con esa lista; si no, con la general.

## Datos

Todo se guarda localmente en IndexedDB (base `calidad_nc_v1`, store `filas`; una fila por NC).
Las NC no se borran al cambiar de mes: cada una pertenece al mes de su fecha de detección
(`Reglas.mesDe`) y la pantalla filtra por mes o por abiertas. El número de cada NC es su orden
dentro de su mes.
Los stores `no_conformidades` y `meta` son de la Fase 1 (fichas) y se dejan intactos por si hay datos.
El backup es un JSON `{ app: 'registro_nc', version: 2, filas }`; al importar también se aceptan
fichas de la Fase 1 y se convierten a filas (`js/backup.js`).

## Indicadores

- AQ-IND-01: NC activas
- AQ-IND-02: litros NC / litros totales (%)
- AQ-IND-03: desvío más frecuente
- AQ-IND-04: % de reprocesos finalizados dentro de plazo

Se calculan en `Reglas.kpis()` sobre las NC que se ven (el mes elegido o las abiertas).

## Desvíos de QualityOS

QualityOS copia los desvíos de un lote como texto con tabulaciones
(fecha · lote · cliente · producto · etapa · unidad · control y detalle · Reprocesado/Abierto · obs).
`Reglas.leerDesviosQualityOS()` agrupa por lote + etapa + control + estado (una NC por evento y
tipo de desvío), usa el tipo configurado si coincide con el nombre del control, deja cerradas las
corregidas en el momento y calcula el plazo de las abiertas. Si QualityOS cambia ese formato,
actualizar esta función y su prueba.

## Pruebas

```bash
. ~/.nvm/nvm.sh; export NODE_PATH=$(npm root -g)   # Node y Playwright global
node --test tests/                 # reglas
node tests/e2e.js [carpeta]        # navegador real; carpeta opcional para capturas y PDF
```

## Mantenimiento

- **Al modificar cualquier archivo, subí el número `V` en `sw.js`** para que los dispositivos
  descarguen la versión nueva. Si se agrega un archivo, sumarlo a `FILES`.

## Ideas a futuro

Ver [IDEAS.md](IDEAS.md).
