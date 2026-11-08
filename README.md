# Registro de No Conformidades

[![QualityOS](https://img.shields.io/badge/QualityOS-calidad_en_planta-0f5c6e?style=flat-square)](https://github.com/roca-byte)

Registro mensual de No Conformidades (NC) para Aseguramiento de Calidad. Es una PWA que funciona **100 % offline**, sin servidor ni backend: los datos quedan en el propio dispositivo (IndexedDB). Es una réplica local del `registro_nc` de QualityOS.

**App publicada:** https://roca-byte.github.io/calidad-no-conformidades/

## Características

- **Registro tipo planilla**: una fila por NC (fecha, lote, cliente, producto, tipo de desvío, severidad, detección, descripción, litros NC / totales, acción correctiva, plazo, estado, cierre, pallets, responsable y eficacia).
- **Severidad sugerida** automáticamente según el tipo de desvío (Leve / Moderado / Crítico).
- **Plazo automático** de reproceso en días hábiles (configurable; no pisa un plazo cargado a mano).
- **Estados**: Pendiente, En proceso, Finalizado y Anulado. **Eficacia**: Pendiente, Eficaz, No eficaz.
- **Indicadores (KPIs)** en tiempo real:
  - AQ-IND-01: NC activas
  - AQ-IND-02: litros NC / litros totales (%)
  - AQ-IND-03: desvío más frecuente
  - AQ-IND-04: % de reprocesos finalizados dentro de plazo
  - Contadores por severidad
- **Imprimir / PDF** con encabezado de empresa, código y versión del registro, más una segunda hoja con las acciones.
- **Empresa y logo configurables** desde el panel **⚙️ Codificación**: se guardan en el dispositivo y se usan en las dos hojas de impresión (si hay logo, reemplaza al nombre).
- **Descargar Excel** (.xlsx) del período.
- **Backup manual** en `.json` (exportar/importar). También importa fichas de la Fase 1.
- **Quitar duplicados** y **borrar todo**.
- **Tema claro/oscuro** y diseño responsive (tarjetas en celular y tablet).
- **Instalable** en el celular/PC y usable sin conexión gracias al service worker.

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

## Uso

Al ser estática, alcanza con servirla por HTTP (el service worker no funciona con `file://`):

```bash
# desde la carpeta del proyecto
python3 -m http.server 8000
```

Abrir `http://localhost:8000` y, si se quiere, instalarla desde el navegador ("Instalar app" / "Agregar a pantalla de inicio").

También se puede publicar en cualquier hosting estático (GitHub Pages, Netlify, etc.).

## Configuración

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

> **Importante:** al modificar cualquier archivo, subí el número `V` en `sw.js` para que los dispositivos descarguen la versión nueva.

## Datos y respaldo

Todo se guarda localmente en IndexedDB (`calidad_nc_v1`, store `filas`). Si se borran los datos del navegador o se cambia de dispositivo, **se pierde la información**: usá **💾 Exportar backup** con regularidad y **Importar** para restaurar.

## Ideas a futuro

Ver [IDEAS.md](IDEAS.md): fotos por NC, mejora de texto con IA, tipos de desvío configurables y puente con REG-01 por archivo.
