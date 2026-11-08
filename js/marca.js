/*
 * marca.js — Empresa y logo configurables por el usuario.
 *
 * Se guardan solo en este dispositivo (localStorage) y se usan en los encabezados de impresión.
 * Mismo patrón que informeCalidad, controlLinea y mash-check: si hay logo, se muestra el logo;
 * si no, el nombre de la empresa.
 *
 * Se carga después de brand.js para poder sobrescribir BRAND.empresa y BRAND.logo.
 */
window.Marca = (() => {
  const KEY = 'nc_marca.v1';
  const BASE = { empresa: BRAND.empresa || '', logo: '' };

  let datos = { empresa: '', logo: null };
  try { datos = Object.assign(datos, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}

  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(datos)); return true; }
    catch (e) { return false; }
  }

  // Copia la configuración guardada a BRAND, que es lo que leen las impresiones.
  function aplicar() {
    BRAND.empresa = (datos.empresa || '').trim() || BASE.empresa;
    BRAND.logo = (datos.logo && datos.logo.d) || BASE.logo;
  }

  // Reduce el logo (máx. 800x300 px) y lo guarda como PNG para conservar la transparencia.
  function leerLogo(file, cb) {
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 800 / im.width, 300 / im.height);
        const c = document.createElement('canvas');
        c.width = Math.round(im.width * k);
        c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        cb({ d: c.toDataURL('image/png'), w: c.width, h: c.height });
      };
      im.onerror = () => cb(null);
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  aplicar();

  return { datos, guardar, aplicar, leerLogo, KEY, BASE };
})();
