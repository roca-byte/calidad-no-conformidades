# Desarrollo — Registro de No Conformidades

Información técnica para quien quiera modificar o publicar la app. Para usarla, ver el
[README](README.md). Es una réplica local del `registro_nc` de QualityOS.

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
│   ├── app.js          # Lógica de la app, KPIs, impresión, Excel
│   ├── db.js           # Capa de datos (IndexedDB)
│   ├── marca.js        # Empresa y logo configurables (Marca)
│   └── backup.js       # Exportar/importar backup .json
├── vendor/
│   └── xlsx.full.min.js
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

La lista de tipos de desvío (con su severidad sugerida) está en `TIPOS`, dentro de `js/app.js`.

## Datos

Todo se guarda localmente en IndexedDB (base `calidad_nc_v1`, store `filas`; una fila por NC).
Los stores `no_conformidades` y `meta` son de la Fase 1 (fichas) y se dejan intactos por si hay datos.
El backup es un JSON `{ app: 'registro_nc', version: 2, filas }`; al importar también se aceptan
fichas de la Fase 1 y se convierten a filas (`js/backup.js`).

## Indicadores

- AQ-IND-01: NC activas
- AQ-IND-02: litros NC / litros totales (%)
- AQ-IND-03: desvío más frecuente
- AQ-IND-04: % de reprocesos finalizados dentro de plazo

Se calculan en `updateKPIs()` (`js/app.js`).

## Mantenimiento

- **Al modificar cualquier archivo, subí el número `V` en `sw.js`** para que los dispositivos
  descarguen la versión nueva. Si se agrega un archivo, sumarlo a `FILES`.

## Ideas a futuro

Ver [IDEAS.md](IDEAS.md): fotos por NC, mejora de texto con IA, tipos de desvío configurables y puente con REG-01 por archivo.
